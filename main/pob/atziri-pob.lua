-- Atziri Exchange: Path of Building (PoE2) calculations without its window.
--
-- Started by the overlay with LuaJIT, in the folder where Path of Building
-- is installed (read only). Reads one JSON command per line on stdin and
-- answers one line starting with "@@ATZ@@" + JSON on stdout (PoB itself
-- prints other lines, they are ignored).
--
--   {"id":1,"cmd":"load","file":"C:/.../build.xml"}
--   {"id":2,"cmd":"stats"}
--   {"id":3,"cmd":"compare","item":"Rarity: RARE\n..."}

local WRAPPER = assert(os.getenv("ATZIRI_POB_WRAPPER"), "ATZIRI_POB_WRAPPER missing")
package.path = "./lua/?.lua;./lua/?/init.lua;./?.lua;" .. package.path
package.cpath = "./?.dll;" .. package.cpath

arg = {}
-- no update check, no first-run screens
dofile(WRAPPER)

local json = require("dkjson")

local function reply(id, ok, data)
  io.write("@@ATZ@@", json.encode({ id = id, ok = ok, data = data }), "\n")
  io.flush()
end

local loadedFile, loadedTime

local function readFile(path)
  local f = io.open(path, "rb")
  if not f then return nil end
  local t = f:read("*a")
  f:close()
  return t
end

local STAT_KEYS = {
  "Life", "EnergyShield", "Mana", "Spirit", "Armour", "Evasion", "Ward",
  "FireResist", "ColdResist", "LightningResist", "ChaosResist",
  "FireResistOverCap", "ColdResistOverCap", "LightningResistOverCap", "ChaosResistOverCap",
  "BlockChance", "SpellBlockChance", "TotalEHP", "MovementSpeedMod",
  "Str", "Dex", "Int", "ReqStr", "ReqDex", "ReqInt",
  "CritChance", "Speed", "LifeRegenRecovery", "ManaRegenRecovery",
}

local function pick(out)
  local t = {}
  for _, k in ipairs(STAT_KEYS) do
    if type(out[k]) == "number" then t[k] = out[k] end
  end
  return t
end

local function dpsOf(out)
  return out.CombinedDPS or out.TotalDPS or 0
end

-- socket groups that have an active skill
local function skillGroups()
  local list, seen = {}, {}
  for i, group in ipairs(build.skillsTab.socketGroupList) do
    local label = group.displayLabel or ("Skill " .. i)
    -- the same skill in several groups (weapon swap...): keep the first one
    if group.enabled ~= false and group.displaySkillList and #group.displaySkillList > 0 and not seen[label] then
      seen[label] = true
      list[#list + 1] = { index = i, label = label }
    end
  end
  return list
end

-- computes something for each skill, then puts the main skill back
local function eachSkill(fn)
  local main = build.mainSocketGroup
  local res = {}
  for _, g in ipairs(skillGroups()) do
    build.mainSocketGroup = g.index
    build.calcsTab:BuildOutput()
    local r = fn(g)
    if r then res[#res + 1] = r end
  end
  build.mainSocketGroup = main
  build.calcsTab:BuildOutput()
  return res
end

local SLOT_NAMES = {
  "Weapon 1", "Weapon 2", "Helmet", "Body Armour", "Gloves", "Boots",
  "Amulet", "Ring 1", "Ring 2", "Belt", "Charm 1", "Charm 2", "Charm 3",
  "Flask 1", "Flask 2",
}

local function equipment()
  local list = {}
  for _, slotName in ipairs(SLOT_NAMES) do
    local slot = build.itemsTab.slots[slotName]
    local item = slot and build.itemsTab.items[slot.selItemId]
    if item then
      list[#list + 1] = { slot = slotName, name = item.name, rarity = item.rarity }
    end
  end
  return list
end

local function stats()
  local out = build.calcsTab.mainOutput
  local skills = eachSkill(function(g)
    local d = dpsOf(build.calcsTab.mainOutput)
    if d > 0 then return { label = g.label, dps = d } end
  end)
  table.sort(skills, function(a, b) return a.dps > b.dps end)
  local main = build.skillsTab.socketGroupList[build.mainSocketGroup]
  return {
    file = loadedFile,
    className = build.spec.curClassName,
    ascendancy = build.spec.curAscendClassName,
    level = build.characterLevel,
    mainSkill = main and main.displayLabel or nil,
    mainDps = dpsOf(out),
    stats = pick(out),
    skills = skills,
    equipment = equipment(),
  }
end

local function compare(rawItem)
  local item = new("Item", rawItem)
  if not item.base then
    return nil, "unknown base"
  end
  item:NormaliseQuality()
  -- every slot the item can go in (both rings, both weapons...)
  local slots = {}
  for _, slotName in ipairs(SLOT_NAMES) do
    local slot = build.itemsTab.slots[slotName]
    if slot and build.itemsTab:IsItemValidForSlot(item, slotName) then
      local cur = build.itemsTab.items[slot.selItemId]
      slots[#slots + 1] = { slot = slotName, current = cur and cur.name or nil }
    end
  end
  if #slots == 0 then return nil, "no slot" end

  for _, s in ipairs(slots) do
    local calcFunc, base = build.calcsTab:GetMiscCalculator()
    local after = calcFunc({ repSlotName = s.slot, repItem = item })
    s.before = pick(base)
    s.after = pick(after)
  end
  -- damage of each skill, before / after, for each slot
  local skills = eachSkill(function(g)
    local calcFunc, base = build.calcsTab:GetMiscCalculator()
    local before = dpsOf(base)
    local r = { label = g.label, before = before, after = {} }
    for _, s in ipairs(slots) do
      r.after[#r.after + 1] = dpsOf(calcFunc({ repSlotName = s.slot, repItem = item }))
    end
    if before > 0 or r.after[1] > 0 then return r end
  end)
  table.sort(skills, function(a, b) return a.before > b.before end)
  return { item = item.name, slots = slots, skills = skills }
end

local function handle(msg)
  if msg.cmd == "load" then
    local xml = readFile(msg.file)
    if not xml then return nil, "cannot read build" end
    loadBuildFromXML(xml, msg.file)
    loadedFile, loadedTime = msg.file, os.time()
    return { file = loadedFile }
  elseif msg.cmd == "stats" then
    if not loadedFile then return nil, "no build" end
    return stats()
  elseif msg.cmd == "compare" then
    if not loadedFile then return nil, "no build" end
    return compare(msg.item)
  elseif msg.cmd == "ping" then
    return { pong = true }
  end
  return nil, "unknown command"
end

reply(0, true, { ready = true })
for line in io.lines() do
  local msg = json.decode(line)
  if type(msg) == "table" then
    local ok, data, err = pcall(handle, msg)
    if not ok then
      reply(msg.id, false, tostring(data))
    elseif data == nil then
      reply(msg.id, false, err or "failed")
    else
      reply(msg.id, true, data)
    end
  end
end
