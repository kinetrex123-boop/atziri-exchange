<template>
  <!-- Atziri Exchange: never squashed by the flex column (content used to overlap) -->
  <div class="shrink-0">
    <!-- Atziri Exchange: info pills on the left, actions on the right, one row;
         when it does not fit, the whole right group goes under, right-aligned -->
    <div class="flex flex-wrap items-center justify-between gap-2 pb-3">
      <div class="flex flex-wrap items-center gap-2" style="flex: 1 1 auto">
        <filter-btn-numeric
          v-if="filters.socketNumber"
          :filter="filters.socketNumber"
          :name="t('item.gem_sockets')"
          icon="/images/augments/chasse.png"
        />
        <filter-btn-numeric
          v-if="filters.linkedSockets"
          :filter="filters.linkedSockets"
          :name="t('item.linked_sockets')"
        />
        <filter-btn-numeric
          v-if="filters.mapTier"
          :filter="filters.mapTier"
          :name="t('item.map_tier')"
        />
        <filter-btn-numeric
          v-if="filters.awardedAscendancyPoints"
          :filter="filters.awardedAscendancyPoints"
          :name="t('item.ascendancy_points')"
        />
        <filter-btn-numeric
          v-if="filters.areaLevel"
          :filter="filters.areaLevel"
          :name="t('item.area_level')"
        />
        <filter-btn-numeric
          v-if="filters.heistWingsRevealed"
          :filter="filters.heistWingsRevealed"
          :name="t('item.heist_wings_revealed')"
        />
        <filter-btn-numeric
          v-if="filters.sentinelCharge"
          :filter="filters.sentinelCharge"
          :name="t('item.sentinel_charge')"
        />
        <filter-btn-logical
          v-if="filters.mapBlighted"
          readonly
          :filter="{ disabled: false }"
          :text="filters.mapBlighted.value"
        />
        <filter-btn-logical
          v-if="filters.rarity?.value === 'magic'"
          readonly
          :filter="{ disabled: false }"
          text="Magic"
        />
        <filter-btn-logical
          v-if="filters.rarity?.value === 'normal'"
          readonly
          :filter="{ disabled: false }"
          text="Normal"
        />
        <filter-btn-logical
          v-if="filters.discriminator?.value"
          readonly
          :filter="{ disabled: false }"
          :text="filters.discriminator.value"
        />
        <filter-btn-numeric
          v-if="filters.itemLevel"
          :filter="filters.itemLevel"
          :name="t('item.item_level')"
        />
        <filter-btn-numeric
          v-if="filters.requires?.level"
          :filter="filters.requires?.level"
          :name="t('item.requires_level')"
        />
        <filter-btn-numeric
          v-if="filters.stackSize"
          :filter="filters.stackSize"
          :name="t('item.stock')"
        />
        <filter-btn-numeric
          v-if="filters.whiteSockets"
          :filter="filters.whiteSockets"
          :name="t('item.white_sockets')"
        />
        <filter-btn-numeric
          v-if="filters.augmentSockets"
          :filter="filters.augmentSockets"
          :name="t('item.augment_sockets')"
          icon="/images/augments/chasse.png"
        />
        <filter-btn-numeric
          v-if="filters.gemLevel"
          :filter="filters.gemLevel"
          :name="t('item.gem_level')"
        />
        <filter-btn-numeric
          v-if="filters.quality"
          :filter="filters.quality"
          :name="t('item.quality')"
        />
        <template v-if="filters.influences">
          <filter-btn-logical
            v-for="influence of filters.influences"
            :key="influence.value"
            :filter="influence"
            :text="influence.value"
            :img="`/images/influence-${influence.value}.png`"
          />
        </template>
        <!-- Implicitly should only be tier or plain unid from create-item-filters -->
        <filter-btn-numeric
          v-if="filters.unidentifiedTier"
          :filter="filters.unidentifiedTier"
          :name="t('item.unidentified_tier')"
        />
        <filter-btn-logical
          v-else-if="filters.unidentified"
          :filter="filters.unidentified"
          :text="t('item.unidentified')"
        />
        <filter-btn-logical
          v-if="filters.veiled"
          :filter="filters.veiled"
          :text="t('item.veiled')"
        />
        <filter-btn-logical
          v-if="filters.foil"
          :filter="filters.foil"
          :text="t('item.foil_unique')"
        />
        <filter-btn-logical
          v-if="filters.mirrored"
          active
          :filter="filters.mirrored"
          :text="
            t(filters.mirrored.disabled ? 'item.not_mirrored' : 'item.mirrored')
          "
        />
        <filter-btn-logical
          v-if="filters.sanctified"
          active
          :filter="filters.sanctified"
          :text="
            t(
              filters.sanctified.disabled
                ? 'item.not_sanctified'
                : 'item.sanctified',
            )
          "
        />
        <filter-btn-logical
          v-if="filters.ultimatumHint"
          :filter="filters.ultimatumHint"
          :text="t(`item.${filters.ultimatumHint.value.toLowerCase()}`)"
        />

        <!-- Atziri Exchange: only shown to unfold the stats after "Réduire" -->
        <filter-btn-logical
          v-if="hasStats && statsVisibility.disabled"
          :collapse="statsVisibility.disabled"
          :filter="statsVisibility"
          :active="totalSelectedMods > 0"
          :text="
            totalSelectedMods > 0
              ? t('filters.selected_some', [totalSelectedMods, stats.length])
              : t('filters.selected_none')
          "
        />
      </div>
      <div class="flex items-center gap-2 shrink-0 ml-auto">
        <!-- Atziri Exchange: check / uncheck every visible line -->
        <button
          v-if="hasStats && selectableStats.length"
          type="button"
          :class="[$style.exactBtn, { [$style.exactOn]: allSelected }]"
          :title="
            allSelected
              ? tr(
                  'Tout sélectionner · clic : tout décocher',
                  'Select all · click: uncheck everything',
                )
              : tr(
                  'Tout sélectionner · clic : cocher toutes les lignes',
                  'Select all · click: check every line',
                )
          "
          @click="toggleAll"
        >
          <i :class="allSelected ? 'fas fa-check-square' : 'far fa-square'"></i>
          <span>{{ tr("Tout", "All") }}</span>
        </button>
        <!-- Atziri Exchange: every search value at the exact item value -->
        <button
          v-if="hasStats"
          type="button"
          :class="[$style.exactBtn, { [$style.exactOn]: exactValues }]"
          :title="tr('Valeur exacte', 'Exact value') + ' · ' + exactTitle"
          @click="exactValues = !exactValues"
        >
          <i :class="exactValues ? 'fas fa-lock' : 'fas fa-lock-open'"></i>
          <span>{{ tr("Exacte", "Exact") }}</span>
        </button>
        <div
          v-if="showItemEditor !== 'none' || augmentStats.length"
          class="flex items-center bg-gray-900 rounded border border-gray-500 justify-center shrink-0 w-6 h-6 relative cursor-pointer"
        >
          <span v-if="augmentStats.length" :class="$style.runeBadge"
            >{{ augmentSelected }}/{{ augmentStats.length }}</span
          >
          <popover
            trigger="click"
            placement="bottom-end"
            theme=""
            boundary="#price-window"
          >
            <template #target>
              <i
                v-if="canHaveCatalyst && !currentCatalyst"
                class="fas fa-question-circle text-gray-400 text-xl" />
              <img
                v-else-if="currentCatalyst"
                :src="currentCatalyst.icon"
                class="max-w-full max-h-full overflow-hidden" /><img
                v-else
                :src="
                  item.augmentSockets?.augments.some((a) => a)
                    ? '/images/augments/rune.png'
                    : '/images/augments/empty-socket.png'
                "
                class="max-w-full max-h-full overflow-hidden"
            /></template>
            <template #content>
              <!-- Atziri Exchange: augment lines live here now -->
              <div v-if="augmentStats.length" :class="$style.augPop">
                <div :class="$style.groupHead" style="cursor: default">
                  <span>{{ tr("Augmentations", "Augments") }}</span>
                  <span :class="$style.groupCount"
                    >{{ augmentSelected }}/{{ augmentStats.length }}</span
                  >
                  <button
                    type="button"
                    :class="$style.groupBtn"
                    @click.stop="setGroup(augmentStats, true)"
                  >
                    {{ tr("Tout", "All") }}
                  </button>
                  <button
                    type="button"
                    :class="$style.groupBtn"
                    @click.stop="setGroup(augmentStats, false)"
                  >
                    {{ tr("Aucun", "None") }}
                  </button>
                </div>
                <filter-modifier
                  v-for="filter of augmentStats"
                  :key="filter.tag + '/' + filter.text"
                  :filter="filter"
                  :item="item"
                  :show-sources="showFilterSources"
                  :exact="exactValues"
                  @submit="handleStatsSubmit"
                />
                <button
                  v-if="showItemEditor !== 'none'"
                  type="button"
                  :class="$style.editorLink"
                  @click.stop="showEditor = !showEditor"
                >
                  <i
                    class="fas text-xs"
                    :class="showEditor ? 'fa-chevron-up' : 'fa-chevron-down'"
                  ></i>
                  {{ tr("Modifier les augmentations", "Edit augments") }}
                </button>
                <item-editor-v2 v-if="showEditor" :item="item" />
              </div>
              <item-editor-v2 v-else :item="item" />
            </template>
          </popover>
        </div>
      </div>
    </div>
    <!-- Handled parse error -->
    <div
      v-if="!statsVisibility.disabled && hasStats"
      class="mb-4"
      :class="presets.length > 1 ? 'mt-1' : 'mt-4'"
    >
      <div class="flex" v-if="presets.length > 1">
        <div class="w-5 border-b border-gray-700" />
        <div
          class="flex divide-x border-gray-700 border-t border-l border-r rounded-t overflow-hidden"
        >
          <button
            v-for="preset in presets"
            :class="[$style.presetBtn, { [$style.active]: preset.active }]"
            @click="selectPreset(preset.id)"
          >
            {{ t(preset.id) }}
          </button>
        </div>
        <div class="flex-1 border-b border-gray-700" />
      </div>
      <form @submit.prevent="handleStatsSubmit">
        <!-- Atziri Exchange: lines grouped by kind, each group can fold -->
        <template v-for="group in statGroups" :key="group.id">
          <div
            v-if="statGroups.length > 1"
            :class="$style.groupHead"
            @click="toggleGroup(group.id)"
          >
            <i
              class="fas text-xs"
              :class="
                collapsedGroups.includes(group.id)
                  ? 'fa-chevron-right'
                  : 'fa-chevron-down'
              "
            ></i>
            <span>{{ tr(group.label, group.labelEn) }}</span>
            <span :class="$style.groupCount"
              >{{ group.selected }}/{{ group.stats.length }}</span
            >
            <button
              type="button"
              :class="$style.groupBtn"
              @click.stop="setGroup(group.stats, true)"
            >
              {{ tr("Tout", "All") }}
            </button>
            <button
              type="button"
              :class="$style.groupBtn"
              @click.stop="setGroup(group.stats, false)"
            >
              {{ tr("Aucun", "None") }}
            </button>
          </div>
          <template v-if="!collapsedGroups.includes(group.id)">
            <filter-modifier
              v-for="filter of group.stats"
              :key="filter.tag + '/' + filter.text"
              :filter="filter"
              :item="item"
              :show-sources="showFilterSources"
              :exact="exactValues"
              :shared="sharedFilters.has(filter)"
              :compact="group.id === 'property'"
              @submit="handleStatsSubmit"
            />
          </template>
        </template>
        <div
          v-if="!filteredStats.length && !showUnknownMods"
          class="border-b border-gray-700 py-2"
        >
          {{ t("filters.empty") }}
        </div>
        <template v-if="showUnknownMods">
          <unknown-modifier
            v-for="stat of item.unknownModifiers"
            :key="stat.type + '/' + stat.text"
            :stat="stat"
            :item-text="item.rawText"
          />
        </template>
        <template v-if="showMissingFracturedWarning">
          <div class="py-2 border-b border-gray-700 flex flex-col">
            <div class="pb-1 flex items-baseline">
              <i
                class="w-5 shrink-0 fas fa-exclamation-triangle text-orange-400"
              ></i>
              <div
                class="search-text mr-1 relative flex min-w-0"
                style="line-height: 1rem"
              >
                {{ t("Unable to determine fractured stat") }}
              </div>
            </div>
            <div class="ml-5 text-xs leading-none">
              <span class="text-gray-600"
                >{{ t("filters.tag_explicit") }} &mdash;
              </span>
              <a
                target="_blank"
                href="https://www.pathofexile.com/forum/view-thread/3891367"
                class="text-orange-400 underline hidden"
                >Bug Report</a
              >
            </div>
          </div>
        </template>
        <input type="submit" class="hidden" />
      </form>
      <div class="flex gap-x-4">
        <button
          @click="statsVisibility.disabled = !statsVisibility.disabled"
          class="bg-gray-700 px-2 py-1 text-gray-400 leading-none rounded-b w-40"
        >
          {{ t("filters.collapse") }}
          <i class="fas fa-chevron-up pl-1 text-xs text-gray-600"></i>
        </button>
        <ui-toggle
          v-if="filteredStats.length !== stats.length"
          v-model="showHidden"
          class="text-gray-400 pt-2"
          >{{ t(hiddenLabel) }}</ui-toggle
        >
        <ui-toggle
          v-model="showFilterSources"
          class="ml-auto text-gray-400 pt-2"
          >{{ t("filters.mods_toggle") }}</ui-toggle
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  watch,
  shallowRef,
  shallowReactive,
  computed,
  PropType,
} from "vue";
import { useI18n } from "vue-i18n";
import UiToggle from "@/web/ui/UiToggle.vue";
import { tr } from "@/web/atziri-lang";
import ItemEditorV2 from "@/web/price-check/item-editor/ItemEditorV2.vue";
import FilterModifier from "./FilterModifier.vue";
import FilterBtnNumeric from "./FilterBtnNumeric.vue";
import FilterBtnLogical from "./FilterBtnLogical.vue";
import UnknownModifier from "./UnknownModifier.vue";
import { ItemFilters, StatFilter, FilterTag } from "./interfaces";
import {
  ParsedItem,
  ItemRarity,
  ItemCategory,
  itemIsModifiable,
} from "@/parser";
import FilterBtnDropdown from "./FilterBtnDropdown.vue";
import { ModifierType } from "@/parser/modifiers";
import Popover from "@/web/ui/Popover.vue";
import { getItemEditorType } from "../item-editor/item-editor.js";
import { ItemEditorType } from "@/parser/meta.js";
import { CATALYST_TYPES } from "@/assets/data/index.js";

export default defineComponent({
  name: "FiltersBlock",
  emits: ["submit", "preset"],
  components: {
    FilterModifier,
    FilterBtnNumeric,
    FilterBtnLogical,
    FilterBtnDropdown,
    ItemEditorV2,
    UnknownModifier,
    Popover,
    UiToggle,
  },
  props: {
    presets: {
      type: Array as PropType<Array<{ id: string; active: boolean }>>,
      required: true,
    },
    filters: {
      type: Object as PropType<ItemFilters>,
      required: true,
    },
    stats: {
      type: Array as PropType<StatFilter[]>,
      required: true,
    },
    item: {
      type: Object as PropType<ParsedItem>,
      required: true,
    },
  },
  setup(props, ctx) {
    const statsVisibility = shallowReactive({ disabled: false });
    const showHidden = shallowRef(false);
    const showFilterSources = shallowRef(false);

    watch(
      () => props.item,
      () => {
        showHidden.value = false;
        statsVisibility.disabled = false;
        exactValues.value = false;
        showEditor.value = false;
        savedRolls = new WeakMap();
      },
    );

    // --- Atziri Exchange: "Valeur exacte" toggle ---
    const exactValues = shallowRef(false);
    let savedRolls = new WeakMap<
      StatFilter,
      { min: number | "" | undefined; max: number | "" | undefined }
    >();
    watch(exactValues, (exact) => {
      for (const filter of props.stats) {
        const roll = filter.roll;
        if (!roll) continue;
        if (exact) {
          savedRolls.set(filter, { min: roll.min, max: roll.max });
          // keep the side the filter searches on (min, or max when inverted)
          if (roll.min !== undefined && roll.min !== "") roll.min = roll.value;
          if (roll.max !== undefined && roll.max !== "") roll.max = roll.value;
          if (
            (roll.min === undefined || roll.min === "") &&
            (roll.max === undefined || roll.max === "")
          ) {
            roll.min = roll.value;
          }
        } else {
          const saved = savedRolls.get(filter);
          if (saved) {
            roll.min = saved.min;
            roll.max = saved.max;
          }
        }
      }
    });

    // --- Atziri Exchange: lines grouped by kind ---
    const collapsedGroups = shallowRef<string[]>([]);
    const GROUPS: Array<{ id: string; label: string; labelEn: string }> = [
      { id: "property", label: "Propriétés", labelEn: "Properties" },
      { id: "pseudo", label: "Pseudo", labelEn: "Pseudo" },
      { id: "augment", label: "Augmentations", labelEn: "Augments" },
      { id: "implicit", label: "Implicites", labelEn: "Implicits" },
      { id: "prefix", label: "Préfixes", labelEn: "Prefixes" },
      { id: "suffix", label: "Suffixes", labelEn: "Suffixes" },
      { id: "explicit", label: "Explicites", labelEn: "Explicits" },
      { id: "other", label: "Autres", labelEn: "Other" },
    ];
    function groupOf(filter: StatFilter): string {
      switch (filter.tag) {
        case FilterTag.Property:
          return "property";
        case FilterTag.Pseudo:
          return "pseudo";
        case FilterTag.Augment:
        case FilterTag.AddedAugment:
          return "augment";
        case FilterTag.Implicit:
        case FilterTag.Enchant:
        case FilterTag.Corrupted:
          return "implicit";
      }
      const generation = filter.sources?.[0]?.modifier.info.generation;
      if (generation === "prefix") return "prefix";
      if (generation === "suffix") return "suffix";
      return filter.tag === FilterTag.Variant || filter.tag === FilterTag.Skill
        ? "other"
        : "explicit";
    }
    function toggleGroup(id: string) {
      collapsedGroups.value = collapsedGroups.value.includes(id)
        ? collapsedGroups.value.filter((g) => g !== id)
        : [...collapsedGroups.value, id];
    }
    function setGroup(stats: StatFilter[], on: boolean) {
      for (const s of stats) s.disabled = !on;
    }

    const showUnknownMods = computed(
      () =>
        props.item.unknownModifiers.length &&
        props.item.category !== ItemCategory.Sentinel &&
        !(
          props.item.category === ItemCategory.Map &&
          props.item.rarity === ItemRarity.Unique
        ),
    );

    const showItemEditor = computed(() => {
      if (!itemIsModifiable(props.item)) {
        // can still change socketed items on non-modifiable items
        return (props.item.augmentSockets?.augments.length ?? 0) > 0
          ? getItemEditorType(props.item)
          : ItemEditorType.None;
      }

      return getItemEditorType(props.item);
    });
    // For handling filling augments
    // watch(
    //   () => props.filters.itemEditorSelection?.value,
    //   (selected, prev) => {
    //     const normalCase = selected !== prev && props.filters.tempAugmentStorage;
    //     if (normalCase && selected !== undefined) {
    //       // If last wasn't empty
    //       if (
    //         prev !== "None" &&
    //         props.filters.tempAugmentStorage &&
    //         props.filters.tempAugmentStorage.length > 0
    //       ) {
    //         // Remove current augment
    //         handleRemoveItemEdits(
    //           props.stats,
    //           props.item,
    //           props.filters.tempAugmentStorage!,
    //         );
    //       }
    //       // If we didn't choose empty
    //       if (selected !== "None") {
    //         // add new augment
    //         handleApplyItemEdits(
    //           props.stats,
    //           props.item,
    //           props.filters.tempAugmentStorage!,
    //           selected,
    //         );
    //       }
    //     }
    //   },
    // );

    const { t } = useI18n();

    const filteredStats = computed(() => {
      if (showHidden.value) {
        return props.stats.filter((s) => s.hidden);
      } else {
        return props.stats.filter((s) => !s.hidden);
      }
    });

    // Atziri Exchange: augments moved to the rune popover
    const showEditor = shallowRef(false);
    const augmentStats = computed(() =>
      filteredStats.value.filter((s) => groupOf(s) === "augment"),
    );
    const augmentSelected = computed(
      () => augmentStats.value.filter((s) => !s.disabled).length,
    );

    // Atziri Exchange: lines fed by a mod that also feeds another line (hybrid)
    const sharedFilters = computed(() => {
      const owners = new Map<object, StatFilter[]>();
      for (const f of props.stats) {
        if (f.tag === FilterTag.Property || f.tag === FilterTag.Pseudo)
          continue;
        for (const src of f.sources) {
          const list = owners.get(src.modifier) ?? [];
          if (!list.includes(f)) list.push(f);
          owners.set(src.modifier, list);
        }
      }
      const out = new Set<StatFilter>();
      for (const list of owners.values()) {
        if (list.length > 1) list.forEach((f) => out.add(f));
      }
      return out;
    });

    // Atziri Exchange: "Tout sélectionner" (visible lines, augments excluded)
    const selectableStats = computed(() =>
      showHidden.value
        ? []
        : filteredStats.value.filter((s) => groupOf(s) !== "augment"),
    );
    const allSelected = computed(
      () =>
        selectableStats.value.length > 0 &&
        selectableStats.value.every((s) => !s.disabled),
    );
    function toggleAll() {
      const on = !allSelected.value;
      for (const s of selectableStats.value) s.disabled = !on;
    }

    const statGroups = computed(() =>
      GROUPS.filter((g) => g.id !== "augment")
        .map((g) => {
          const stats = filteredStats.value.filter((s) => groupOf(s) === g.id);
          return {
            ...g,
            stats,
            selected: stats.filter((s) => !s.disabled).length,
          };
        })
        .filter((g) => g.stats.length),
    );

    return {
      t,
      tr,
      exactValues,
      exactTitle: computed(() =>
        exactValues.value
          ? tr("Revenir aux marges d'avant", "Back to the previous ranges")
          : tr("Toutes les valeurs à l'exact", "Every value at the exact roll"),
      ),
      showEditor,
      selectableStats,
      allSelected,
      toggleAll,
      augmentStats,
      augmentSelected,
      sharedFilters,
      collapsedGroups,
      statGroups,
      toggleGroup,
      setGroup,
      statsVisibility,
      showHidden,
      showFilterSources,
      totalSelectedMods: computed(() => {
        return props.stats.filter((stat) => !stat.disabled).length;
      }),
      filteredStats,
      showUnknownMods,
      hasStats: computed(
        () =>
          props.stats.length ||
          (showUnknownMods.value && props.item.rarity === ItemRarity.Unique) ||
          props.presets.length > 1,
      ),
      handleStatsSubmit() {
        ctx.emit("submit");
      },
      selectPreset(id: string) {
        ctx.emit("preset", id);
      },
      hiddenLabel: computed(() => {
        if (
          props.item.category === ItemCategory.Map ||
          props.item.category === ItemCategory.Waystone
        ) {
          return t("filters.hidden_explicit_toggle");
        } else {
          return t("filters.hidden_toggle");
        }
      }),
      showMissingFracturedWarning: computed(() => {
        return (
          // is fractured
          props.item.isFractured &&
          // on base item preset
          props.presets.some(
            (p) => p.id === "filters.preset_base_item" && p.active,
          ) &&
          // but item itself has no fractured mods
          !props.item.statsByType.some(
            (calc) => calc.type === ModifierType.Fractured,
          )
        );
      }),
      showItemEditor,
      canHaveCatalyst: computed(() => {
        return (
          props.item.category === ItemCategory.Ring ||
          props.item.category === ItemCategory.Amulet ||
          props.item.category === ItemCategory.Jewel
        );
      }),
      currentCatalyst: computed(() => {
        if (
          !props.item.qualityType ||
          !props.item.quality ||
          showItemEditor.value !== ItemEditorType.Catalyst
        )
          return undefined;

        const catalysts =
          props.item.category === ItemCategory.Jewel
            ? CATALYST_TYPES.Refined
            : CATALYST_TYPES.Normal;

        return catalysts.find((c) => c.tags[1] === props.item.qualityType);
      }),
    };
  },
});
</script>

<style lang="postcss" module>
/* Atziri Exchange: group headers of the mod lines */
.groupHead {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 3px 8px;
  border-radius: 5px;
  cursor: pointer;
  user-select: none;
  background: theme("colors.blue.900");
  color: theme("colors.blue.400");
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.groupCount {
  margin-left: auto;
  color: theme("colors.gray.400");
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
}

.groupBtn {
  font-size: 0.68rem;
  text-transform: none;
  letter-spacing: 0;
  padding: 0 6px;
  border-radius: 4px;
  border: 1px solid theme("colors.blue.800");
  color: theme("colors.blue.300");

  &:hover {
    border-color: theme("colors.blue.400");
  }
}

.exactBtn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 1.5rem;
  padding: 0 8px;
  white-space: nowrap;
  @apply rounded border border-gray-700 bg-gray-900 text-gray-500 text-xs;

  &:hover {
    @apply border-gray-500 text-gray-300;
  }
}

.exactOn {
  @apply text-yellow-300;
  border-color: theme("colors.yellow.500");
  background: rgb(120 90 20 / 0.35);

  &:hover {
    @apply text-yellow-200;
    border-color: theme("colors.yellow.400");
  }
}

.runeBadge {
  position: absolute;
  top: -7px;
  right: -9px;
  z-index: 1;
  padding: 0 4px;
  border-radius: 8px;
  font-size: 0.6rem;
  line-height: 0.9rem;
  @apply bg-red-800 text-white;
  pointer-events: none;
}

.augPop {
  width: 26rem;
  max-width: 80vw;
  @apply bg-gray-900 text-gray-200 p-2 rounded;
  text-align: left;
}

.editorLink {
  margin-top: 6px;
  @apply text-xs text-gray-400;

  &:hover {
    @apply text-white;
  }
}

.presetBtn {
  @apply border-gray-700 bg-gray-800;
  @apply px-2;
  min-width: 3rem;

  &:hover {
    @apply bg-gray-700;
  }

  &.active {
    background: linear-gradient(
      to bottom,
      theme("colors.gray.900"),
      theme("colors.gray.800")
    );
  }
}
</style>
