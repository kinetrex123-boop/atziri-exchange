<template>
  <!-- Atziri Exchange: the most used settings, gathered on the first page -->
  <div class="flex gap-6 p-2 items-start justify-between">
  <div class="max-w-md flex-1">
    <!-- League -->
    <div class="mb-2" v-if="!leagues.error.value">
      <div class="flex-1 mb-1">
        {{ t("league") }}
        <button
          class="btn"
          @click="leagues.load"
          :disabled="leagues.isLoading.value"
        >
          {{ tr("Actualiser", "Refresh") }}
        </button>
      </div>
      <div v-if="leagues.isLoading.value" class="mb-4">
        <i class="fas fa-info-circle text-gray-600"></i>
        {{ t("app.leagues_loading") }}
      </div>
      <template v-else-if="leagues.list.value.length">
        <div class="mb-2 flex flex-col gap-1 items-start whitespace-nowrap">
          <ui-radio
            v-for="league of leagues.list.value"
            :key="league.id"
            v-model="leagueId"
            :value="league.id"
            >{{ league.text }}</ui-radio
          >
        </div>
        <div class="flex gap-x-2 mb-4">
          <div class="text-gray-500">{{ t("settings.private_league") }}</div>
          <input
            v-model="customLeagueId"
            placeholder="My League (PL12345)"
            class="rounded bg-gray-900 px-1 mb-1 flex-1"
          />
        </div>
      </template>
    </div>
    <ui-error-box v-else class="mb-4">
      <template #name>{{ t("app.leagues_failed") }}</template>
      <p>{{ t("app.leagues_failed_help_alt") }}</p>
      <template #actions>
        <button class="btn" @click="leagues.load">
          {{ tr("Réessayer", "Retry") }}
        </button>
      </template>
    </ui-error-box>

    <!-- Language -->
    <div class="mb-4">
      <div class="flex-1 mb-1">{{ t("settings.language") }}</div>
      <select v-model="language" class="p-1 rounded bg-gray-700 w-40">
        <option value="en">English</option>
        <option value="ru">Русский</option>
        <option value="cmn-Hant">正體中文</option>
        <option value="ko">한국어</option>
        <option value="ja">日本語</option>
        <option value="de">Deutsch</option>
        <option value="es">Español</option>
        <option value="pt">Português (Brasil)</option>
        <option value="fr">Français</option>
      </select>
    </div>

    <!-- Start with the game (Windows) -->
    <div v-if="autostart?.supported" class="mb-4">
      <ui-checkbox
        :model-value="autostart.enabled"
        @update:model-value="setAutostart"
        >{{ tr("Lancer avec le jeu", "Start with the game") }}</ui-checkbox
      >
      <div class="text-gray-500 text-sm mt-1">
        {{
          tr(
            "L'overlay démarre discrètement avec Windows (icône près de l'horloge) et s'active quand Path of Exile 2 s'ouvre. Désactivé : il se ferme 5 s après le jeu.",
            "The overlay starts quietly with Windows (icon near the clock) and wakes up when Path of Exile 2 opens. Off: it closes 5 s after the game.",
          )
        }}
      </div>
    </div>

    <!-- Fill stat values -->
    <div class="mb-2">
      <div class="flex-1 mb-1">{{ t("price_check.fill_rolls") }}</div>
      <div class="mb-4 flex">
        <div class="flex mr-6">
          <span class="mr-1">+-</span>
          <input
            v-model.number="searchStatRange"
            class="rounded bg-gray-900 px-1 block w-16 mb-1 font-poe text-center"
          />
          <span class="ml-1">%</span>
        </div>
        <ui-radio v-model="searchStatRange" :value="0">{{
          t("price_check.fill_roll_exact")
        }}</ui-radio>
      </div>
    </div>

    <!-- Core currency -->
    <div class="mb-4">
      <div class="flex-1 mb-1">{{ t("price_check.core_currency") }}</div>
      <div class="mb-1 flex">
        <ui-radio
          v-for="currency of availableCoreCurrencies"
          :key="currency.id"
          v-model="coreCurrency"
          :value="currency.id"
          class="mr-4"
          use-bg-selection
        >
          <div class="flex flex-row items-center">
            <ui-item-img
              :icon="currency.icon"
              overflow-hidden
              class="w-8 h-8"
            />
            <div>{{ t(currency.text) }}</div>
          </div>
        </ui-radio>
      </div>
    </div>
    <ui-checkbox class="mb-6" v-model="rememberCurrency">{{
      t("price_check.remember_currency")
    }}</ui-checkbox>

    <!-- Hotkeys -->
    <div class="flex flex-col gap-4 mb-6">
      <div class="flex">
        <label class="flex-1">{{ t("item.open_on_poedb") }}</label>
        <hotkey-input v-model="poedbKey" class="w-48" />
      </div>
      <div class="flex">
        <label class="flex-1">{{
          tr("Ajouter l'objet aux loots (onglet Farm)", "Add the item to the loots (Farm tab)")
        }}</label>
        <hotkey-input v-model="farmKey" class="w-48" />
      </div>
      <div class="flex">
        <label class="flex-1">{{
          tr("Comparer l'objet à mon build PoB", "Compare the item with my PoB build")
        }}</label>
        <hotkey-input v-model="pobKey" class="w-48" />
      </div>
      <div class="flex">
        <label class="flex-1">{{
          tr("Mettre en pause le compteur (onglet Suivi craft)", "Pause the counter (Craft tracking tab)")
        }}</label>
        <hotkey-input v-model="craftPauseKey" class="w-48" />
      </div>
      <div class="flex">
        <label class="flex-1">{{
          tr("Prix des récompenses de runes à l'écran (Rune Rewards)", "Prices of the rune rewards on screen (Rune Rewards)")
        }}</label>
        <hotkey-input v-model="runeKey" class="w-48" />
      </div>
      <div class="flex">
        <label class="flex-1">{{
          tr("Tiers des 3 choix du Puits des Âmes (Well of Souls)", "Tiers of the 3 Well of Souls choices")
        }}</label>
        <hotkey-input v-model="wellKey" class="w-48" />
      </div>
      <HotkeysGeneric :hotkeys="priceCheckHotkeys" />
    </div>

    <!-- Item tooltip on price hover -->
    <div class="mb-4">
      <div class="flex-1 mb-1">{{ t("price_check.use_tooltip_hover") }}</div>
      <div class="mb-1 flex">
        <ui-radio v-model="tooltipHover" value="off" class="mr-4">{{
          t("price_check.use_tooltip_off")
        }}</ui-radio>
        <ui-radio v-model="tooltipHover" value="keybind" class="mr-4">{{
          t("price_check.use_tooltip_keybind")
        }}</ui-radio>
        <ui-radio v-model="tooltipHover" value="always">{{
          t("price_check.use_tooltip_always")
        }}</ui-radio>
      </div>
    </div>

    <!-- Item and mod lists kept up to date from GitHub -->
    <div class="atz-data mb-4">
      <div v-if="dataStatus?.atziriVersion" class="text-gray-400 mb-2">
        Atziri {{ dataStatus.atziriVersion }}
        <span class="text-gray-500">(Exiled Exchange 2 {{ dataStatus.appVersion }})</span>
      </div>
      <div class="flex-1 mb-1">{{ tr("Listes d'objets et de mods", "Item and mod lists") }}</div>
      <ui-checkbox class="mb-2" :model-value="dataStatus?.enabled ?? true" @update:model-value="setDataEnabled">
        {{ tr("Mettre à jour automatiquement (vérifié toutes les 3 h)", "Update automatically (checked every 3 h)") }}
      </ui-checkbox>
      <div class="text-gray-400 mb-2">
        <template v-if="!dataStatus">{{ tr("Chargement…", "Loading…") }}</template>
        <template v-else-if="currentLangData">
          {{ tr("Mise à jour installée le", "Update installed on") }} {{ dayTime(currentLangData.updatedAt) }} ({{
            currentLangData.items
          }} {{ tr("objets", "items") }}, {{ currentLangData.stats }} mods){{
            currentLangData.active ? "" : tr(" — utilisée au prochain démarrage", " — used from the next start")
          }}.
        </template>
        <template v-else>{{ tr("Listes intégrées à l'appli (aucune mise à jour nécessaire pour l'instant).", "Lists bundled with the app (no update needed for now).") }}</template>
        <div v-if="dataStatus?.lastCheck">
          {{ tr("Dernière vérification :", "Last check:") }} {{ dayTime(dataStatus.lastCheck) }}
        </div>
        <div v-if="dataStatus?.lastError" class="text-red-400">
          {{ tr("Échec :", "Failed:") }} {{ dataStatus.lastError }}
        </div>
      </div>
      <a
        v-if="dataStatus?.atziriUpdate"
        class="atz-upstream mb-2 block"
        :href="dataStatus.atziriUpdate.url"
        target="_blank"
        rel="noreferrer"
      >
        {{
          tr(
            "Nouvelle version d'Atziri Exchange disponible : clique pour la télécharger.",
            "A new Atziri Exchange version is available: click to download it.",
          )
        }}
      </a>
      <div v-if="dataStatus?.upstream" class="atz-upstream mb-2">
        <template v-if="isFrench()">
          Nouvelle version d'Exiled Exchange 2 disponible ({{ dataStatus.upstream.version }}, tu as {{ dataStatus.appVersion }}).
          Les listes et les prix suivent tout seuls ; seules les nouveautés du code (nouveaux types d'objets) demandent une mise à jour de l'appli :
          demande à Claude de l'intégrer.
        </template>
        <template v-else>
          A new Exiled Exchange 2 version is out ({{ dataStatus.upstream.version }}, you have {{ dataStatus.appVersion }}).
          Lists and prices follow on their own; only code changes (new item types) need an app update:
          ask Claude to merge it.
        </template>
      </div>
      <div class="flex gap-2">
        <button
          v-if="dataStatus?.pendingApply"
          class="btn"
          :disabled="dataBusy"
          @click="applyNow"
        >
          {{ tr("Appliquer maintenant (redémarre)", "Apply now (restarts)") }}
        </button>
        <button class="btn" :disabled="dataBusy" @click="dataAction('check')">
          {{ dataBusy ? tr("Vérification…", "Checking…") : tr("Vérifier maintenant", "Check now") }}
        </button>
        <button class="btn" :disabled="dataBusy" @click="dataAction('reset')">
          {{ tr("Revenir aux listes d'origine", "Back to the original lists") }}
        </button>
      </div>
    </div>

    <!-- Backup of the Farm > Setup cards and of the craft methods -->
    <div class="mb-4 mt-4">
      <div class="flex-1 mb-1">{{ tr("Sauvegarde", "Backup") }}</div>
      <p class="text-gray-500 text-sm mb-2">
        {{
          tr(
            "Fiches Farm > Setup et méthodes de craft, images comprises, dans un fichier .json : pour garder une copie ou les retrouver sur un autre PC.",
            "Farm > Setup cards and craft methods, images included, in one .json file: to keep a copy or get them back on another PC.",
          )
        }}
      </p>
      <div class="flex gap-2">
        <button class="btn" :disabled="backupBusy" @click="doExport">
          <i class="fas fa-download"></i> {{ tr("Exporter", "Export") }}
        </button>
        <label class="btn cursor-pointer" :class="{ 'opacity-50 pointer-events-none': backupBusy }">
          <i class="fas fa-upload"></i> {{ tr("Importer…", "Import…") }}
          <input type="file" accept=".json,application/json" class="hidden" @change="pickBackup" />
        </label>
      </div>
      <div v-if="backupPending" class="atz-upstream mt-2">
        <p class="mb-2">
          {{
            tr(
              `Remplacer tes fiches Setup et tes méthodes par celles du fichier (${backupPending.setups} fiche(s), ${backupPending.methods} méthode(s)${backupPending.savedAt ? ", du " + new Date(backupPending.savedAt).toLocaleString(dateLocale()) : ""}) ? Celles d'aujourd'hui seront effacées.`,
              `Replace your Setup cards and methods with the ones of the file (${backupPending.setups} card(s), ${backupPending.methods} method(s)${backupPending.savedAt ? ", from " + new Date(backupPending.savedAt).toLocaleString(dateLocale()) : ""})? The current ones will be erased.`,
            )
          }}
        </p>
        <div class="flex gap-2">
          <button class="btn" :disabled="backupBusy" @click="doImport">{{ tr("Remplacer", "Replace") }}</button>
          <button class="btn" :disabled="backupBusy" @click="backupPending = null">{{ tr("Annuler", "Cancel") }}</button>
        </div>
      </div>
      <p v-if="backupMsg" class="text-sm mt-2" :class="backupError ? 'text-red-400' : 'text-gray-400'">{{ backupMsg }}</p>
    </div>

    <!-- Visual style: only the look changes (colors, borders, glows), never fonts or layout -->
    <div class="mb-4 mt-6">
      <div class="flex-1 mb-1">{{ tr("Style visuel", "Visual style") }}</div>
      <p class="text-gray-500 text-sm mb-3">
        {{
          tr(
            "Change seulement l'aspect de l'overlay : la police, la disposition et les fonctions restent les mêmes.",
            "Only changes how the overlay looks: fonts, layout and features stay the same.",
          )
        }}
      </p>
      <div class="atz-orn-wrap">
        <div class="atz-skin-grid atz-style-col">
          <button
            v-for="skin in SKINS"
            :key="skin.id"
            type="button"
            class="atz-skin-card"
            :class="{ 'is-active': activeSkin === skin.id }"
            @click="setSkin(skin.id)"
          >
            <span
              class="atz-skin-preview"
              :class="`atz-skin-preview--${skin.id}`"
              :style="{ '--p-bg': skinPreviews[skin.id][0], '--p-accent': skinPreviews[skin.id][1] }"
            >
              <span class="atz-skin-bar"></span>
              <span class="atz-skin-line"></span>
              <span class="atz-skin-line atz-skin-line--short"></span>
            </span>
            <span class="atz-skin-name">
              <i v-if="activeSkin === skin.id" class="fas fa-check"></i>
              {{ tr(skin.fr, skin.en) }}
            </span>
          </button>
        </div>

        <!-- color of the style, next to the cards -->
        <div class="atz-tint atz-tint--style">
          <div class="atz-fx-label mb-1">{{ tr("Couleur du style", "Style color") }}</div>
          <p v-if="!activeSkinHasColors" class="atz-fx-hint">
            {{
              tr(
                "Classique et Personnalisé gardent tes propres couleurs : règle-les dans « Couleurs de l'overlay ».",
                "Classic and Custom keep your own colors: set them in Overlay colors.",
              )
            }}
          </p>
          <template v-else>
            <div class="flex flex-wrap gap-1 mb-2">
              <button
                v-for="m in TINT_MODES"
                :key="m.id"
                type="button"
                class="atz-preset atz-preset--sm"
                :class="{ 'is-active': currentStyleTint.mode === m.id }"
                @click="setStyleTint({ mode: m.id })"
              >
                {{ tr(m.fr, m.en) }}
              </button>
            </div>

            <div class="atz-tint-palette">
              <button
                v-for="c in STYLE_PALETTE"
                :key="c.c"
                type="button"
                class="atz-tint-swatch"
                :class="{ 'is-active': currentStyleTint.mode === 'color' && currentStyleTint.c1 === c.c }"
                :style="{ background: c.c }"
                :title="tr(c.fr, c.en)"
                @click="setStyleTint({ mode: 'color', c1: c.c })"
              ></button>
            </div>

            <template v-if="currentStyleTint.mode === 'hue'">
              <label class="atz-tint-row">
                <span class="atz-fx-label">{{ tr("Teinte", "Hue") }}</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  :value="currentStyleTint.hue"
                  @input="setStyleTint({ hue: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="atz-fx-val">{{ currentStyleTint.hue }}°</span>
              </label>
              <label class="atz-tint-row">
                <span class="atz-fx-label">{{ tr("Saturation", "Saturation") }}</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  :value="currentStyleTint.sat"
                  @input="setStyleTint({ sat: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="atz-fx-val">{{ currentStyleTint.sat }} %</span>
              </label>
              <label class="atz-tint-row">
                <span class="atz-fx-label">{{ tr("Luminosité", "Brightness") }}</span>
                <input
                  type="range"
                  min="40"
                  max="160"
                  step="5"
                  :value="currentStyleTint.light"
                  @input="setStyleTint({ light: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="atz-fx-val">{{ currentStyleTint.light }} %</span>
              </label>
            </template>
            <div v-else-if="currentStyleTint.mode === 'color'" class="atz-tint-colors">
              <label>
                <input
                  type="color"
                  :value="currentStyleTint.c1"
                  @input="setStyleTint({ c1: ($event.target as HTMLInputElement).value })"
                />
                <span>{{ tr("Couleur d'accent", "Accent color") }}</span>
              </label>
            </div>
            <p v-else class="atz-fx-hint">
              {{
                tr(
                  "Choisis une couleur dans la palette, ou Teinte pour décaler toutes les couleurs du style.",
                  "Pick a color in the palette, or Hue to shift every color of the style.",
                )
              }}
            </p>
          </template>
        </div>
      </div>
      <p v-if="activeSkin !== 'classic'" class="text-gray-500 text-sm mt-2">
        {{
          tr(
            "Tu peux encore retoucher les couleurs à droite. Revenir à Classique remet tes couleurs d'avant.",
            "You can still adjust the colors on the right. Going back to Classic restores your previous colors.",
          )
        }}
      </p>

      <!-- Extra look settings -->
      <div class="atz-fx">
        <label class="atz-fx-row">
          <span class="atz-fx-label">{{ tr("Intensité des effets", "Effect intensity") }}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            :value="skinFx.intensity"
            @input="setSkinFx({ intensity: Number(($event.target as HTMLInputElement).value) })"
          />
          <span class="atz-fx-val">{{ skinFx.intensity }} %</span>
        </label>
        <label class="atz-fx-row">
          <span class="atz-fx-label">{{ tr("Opacité du fond de l'overlay", "Overlay background opacity") }}</span>
          <input
            type="range"
            min="30"
            max="100"
            step="5"
            :value="skinFx.opacity"
            @input="setSkinFx({ opacity: Number(($event.target as HTMLInputElement).value) })"
          />
          <span class="atz-fx-val">{{ skinFx.opacity }} %</span>
        </label>

        <div class="atz-orn-wrap mt-3">
          <div class="atz-orn-col">
            <div class="atz-fx-label mb-1">{{ tr("Ornement du cadre", "Frame ornament") }}</div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="o in ornamentChoices"
                :key="o.id"
                type="button"
                class="atz-preset"
                :class="{ 'is-active': currentOrnament === o.id }"
                @click="setOrnament(o.id)"
              >
                {{ tr(o.fr, o.en) }}
              </button>
            </div>
          </div>

          <!-- color of the ornament, next to the list -->
          <div v-if="currentOrnament !== 'none'" class="atz-tint">
            <div class="atz-tint-head">
              <div
                class="atz-tint-preview"
                :class="{ 'atz-tint-preview--img': !!ornPreviewImg }"
                :style="{ filter: tintFilter }"
              >
                <img v-if="ornPreviewImg" :src="ornPreviewImg" alt="" />
              </div>
              <div class="min-w-0">
                <div class="atz-fx-label mb-1">{{ tr("Couleur des ornements", "Ornament color") }}</div>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="m in TINT_MODES"
                    :key="m.id"
                    type="button"
                    class="atz-preset atz-preset--sm"
                    :class="{ 'is-active': currentTint.mode === m.id }"
                    @click="setOrnTint({ mode: m.id })"
                  >
                    {{ tr(m.fr, m.en) }}
                  </button>
                </div>
              </div>
            </div>

            <div class="atz-tint-palette">
              <button
                v-for="c in TINT_PALETTE"
                :key="c.c1"
                type="button"
                class="atz-tint-swatch"
                :class="{ 'is-active': currentTint.mode === 'color' && currentTint.c1 === c.c1 && currentTint.c2 === c.c2 }"
                :style="{ background: `linear-gradient(135deg, ${c.c1} 0 55%, ${c.c2} 55% 100%)` }"
                :title="tr(c.fr, c.en)"
                @click="setOrnTint({ mode: 'color', c1: c.c1, c2: c.c2 })"
              ></button>
            </div>

            <template v-if="currentTint.mode === 'hue'">
              <label class="atz-tint-row">
                <span class="atz-fx-label">{{ tr("Teinte", "Hue") }}</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  :value="currentTint.hue"
                  @input="setOrnTint({ hue: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="atz-fx-val">{{ currentTint.hue }}°</span>
              </label>
              <label class="atz-tint-row">
                <span class="atz-fx-label">{{ tr("Saturation", "Saturation") }}</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  step="5"
                  :value="currentTint.sat"
                  @input="setOrnTint({ sat: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="atz-fx-val">{{ currentTint.sat }} %</span>
              </label>
              <label class="atz-tint-row">
                <span class="atz-fx-label">{{ tr("Luminosité", "Brightness") }}</span>
                <input
                  type="range"
                  min="40"
                  max="160"
                  step="5"
                  :value="currentTint.light"
                  @input="setOrnTint({ light: Number(($event.target as HTMLInputElement).value) })"
                />
                <span class="atz-fx-val">{{ currentTint.light }} %</span>
              </label>
            </template>

            <div v-else-if="currentTint.mode === 'color'" class="atz-tint-colors">
              <label>
                <input
                  type="color"
                  :value="currentTint.c1"
                  @input="setOrnTint({ c1: ($event.target as HTMLInputElement).value })"
                />
                <span>{{ tr("Principale", "Main") }}</span>
              </label>
              <label>
                <input
                  type="color"
                  :value="currentTint.c2"
                  @input="setOrnTint({ c2: ($event.target as HTMLInputElement).value })"
                />
                <span>{{ tr("Reflet", "Highlight") }}</span>
              </label>
            </div>
            <p v-else class="atz-fx-hint">
              {{ tr("Choisis une couleur dans la palette, ou Teinte pour décaler toutes les couleurs.", "Pick a color in the palette, or Hue to shift every color.") }}
            </p>
          </div>
        </div>

        <div class="atz-fx-label mt-3 mb-1">
          {{ tr("Effet d'ambiance du style", "Style's ambient effect") }}
        </div>
        <p v-if="!ambientChoices.length" class="atz-fx-hint">
          {{ tr("Choisis un style au-dessus pour avoir ses effets animés.", "Pick a style above to get its animated effects.") }}
        </p>
        <div v-else class="flex flex-wrap gap-2">
          <button
            v-for="a in ambientChoices"
            :key="a.id"
            type="button"
            class="atz-preset"
            :class="{ 'is-active': activeAmbients.includes(a.id) }"
            :aria-pressed="activeAmbients.includes(a.id)"
            @click="toggleAmbient(a.id)"
          >
            <i class="fas" :class="activeAmbients.includes(a.id) ? 'fa-check' : 'fa-plus'"></i>
            {{ tr(a.fr, a.en) }}
          </button>
        </div>
        <label v-if="ambientChoices.length" class="atz-fx-row mt-2">
          <span class="atz-fx-label">{{ tr("Vitesse des effets", "Effect speed") }}</span>
          <input
            type="range"
            min="25"
            max="300"
            step="5"
            :value="skinFx.speed"
            @input="setSkinFx({ speed: Number(($event.target as HTMLInputElement).value) })"
          />
          <span class="atz-fx-val">{{ (skinFx.speed / 100).toFixed(2).replace(".", ",") }}×</span>
        </label>
        <div v-if="ambientChoices.length" class="atz-fx-row">
          <span class="atz-fx-label">{{ tr("Images par seconde des effets", "Effect frame rate") }}</span>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="f in FPS_CHOICES"
              :key="f.v"
              type="button"
              class="atz-preset atz-preset--sm"
              :class="{ 'is-active': skinFx.fps === f.v }"
              @click="setSkinFx({ fps: f.v })"
            >
              {{ tr(f.fr, f.en) }}
            </button>
          </div>
          <span></span>
        </div>
        <p v-if="ambientChoices.length" class="atz-fx-hint mb-1">
          {{
            tr(
              "30 suffit pour des effets fluides et laisse plus de puissance à l'overlay et au jeu.",
              "30 is enough for smooth effects and leaves more power to the overlay and the game.",
            )
          }}
        </p>
        <button
          type="button"
          class="btn mt-3"
          @click="setSkinFx({ intensity: 100, opacity: 100, ornaments: {}, speed: 100, fps: 30, ambients: {}, ornTints: {}, styleTints: {} })"
        >
          {{ tr("Réinitialiser ces réglages", "Reset these settings") }}
        </button>
      </div>
    </div>
  </div>

  <!-- Overlay colors: applied immediately, remembered on this PC -->
  <div class="atz-palette">
    <div class="atz-palette-title">{{ tr("Couleurs de l'overlay", "Overlay colors") }}</div>
    <div class="atz-palette-sub">{{ tr("Thèmes d'Atziri Regex", "Atziri Regex themes") }}</div>
    <div class="flex flex-wrap gap-2 mb-4">
      <button
        v-for="(preset, id) in THEME_PRESETS"
        :key="id"
        type="button"
        class="atz-preset"
        :class="{ 'is-active': isActiveTheme(String(id), preset.colors) }"
        @click="setTheme(preset.colors, String(id))"
      >
        <span
          class="atz-dot"
          :style="{ background: preset.colors.accent, borderColor: preset.colors.line }"
        ></span>
        <input
          v-if="renamingTheme === String(id)"
          v-model="renameText"
          class="atz-rename"
          maxlength="30"
          @click.stop
          @keydown.enter="doRenameTheme"
          @keydown.esc="renamingTheme = null"
          @blur="doRenameTheme"
        />
        <template v-else>{{ themeNames[id] ?? tr(preset.label, THEME_NAMES_EN[id] ?? preset.label) }}</template>
        <i
          class="atz-custom-x fas fa-pen"
          :title="tr('Renommer', 'Rename')"
          @click.stop="startRenameTheme(String(id), themeNames[id] ?? tr(preset.label, THEME_NAMES_EN[id] ?? preset.label))"
        ></i>
      </button>
      <!-- themes saved by the player -->
      <button
        v-for="ct in customThemes"
        :key="ct.id"
        type="button"
        class="atz-preset atz-custom"
        :class="{ 'is-active': isActiveTheme(String(ct.id), ct.colors) }"
        @click="useCustomTheme(ct)"
      >
        <span class="atz-dot" :style="{ background: ct.colors.accent, borderColor: ct.colors.line }"></span>
        <input
          v-if="renamingTheme === String(ct.id)"
          v-model="renameText"
          class="atz-rename"
          maxlength="30"
          @click.stop
          @keydown.enter="doRenameTheme"
          @keydown.esc="renamingTheme = null"
          @blur="doRenameTheme"
        />
        <template v-else>{{ ct.name }}</template>
        <i
          class="atz-custom-x fas fa-pen"
          :title="tr('Renommer', 'Rename')"
          @click.stop="startRenameTheme(String(ct.id), ct.name)"
        ></i>
        <i
          class="atz-custom-x fas fa-times"
          :title="tr('Supprimer ce thème', 'Delete this theme')"
          @click.stop="removeCustomTheme(ct.id)"
        ></i>
      </button>
      <template v-if="savingTheme">
        <input
          ref="themeNameEl"
          v-model="themeName"
          maxlength="30"
          class="rounded bg-gray-900 px-2 py-1 w-full"
          :placeholder="tr('Nom du thème', 'Theme name')"
          @keydown.enter="saveTheme"
          @keydown.esc="savingTheme = false"
        />
        <button type="button" class="btn" @click="saveTheme">OK</button>
        <button type="button" class="btn" @click="savingTheme = false">{{ tr("Annuler", "Cancel") }}</button>
      </template>
      <button v-else type="button" class="atz-preset" @click="startSaveTheme">
        <i class="fas fa-plus"></i> {{ tr("Enregistrer mon réglage", "Save my settings") }}
      </button>
    </div>
    <div class="atz-palette-sub">{{ tr("Personnaliser", "Customize") }}</div>
    <div
      v-for="field in COLOR_FIELDS"
      :key="field.key"
      class="atz-color"
      :class="{ 'is-selected': selectedField === field.key }"
      @click="selectedField = field.key"
    >
      <input
        type="color"
        :title="tr('Couleur libre', 'Any color')"
        :value="themeColors[field.key]"
        @click.stop="selectedField = field.key"
        @input="setColor(field.key, ($event.target as HTMLInputElement).value)"
      />
      <span class="flex-1">{{ tr(field.label, field.labelEn) }}</span>
      <code class="atz-hex">{{ themeColors[field.key] }}</code>
    </div>

    <!-- Ready-made colors for the selected field -->
    <div class="atz-palette-sub mt-3">
      Palette · {{ selectedLabel }}
    </div>
    <div class="atz-swatches">
      <button
        v-for="color in swatches"
        :key="color"
        type="button"
        class="atz-swatch"
        :class="{
          'is-active':
            themeColors[selectedField].toLowerCase() === color.toLowerCase(),
        }"
        :style="{ background: color }"
        :title="color"
        @click="setColor(selectedField, color)"
      ></button>
    </div>
    <button type="button" class="btn mt-3" @click="setTheme(DEFAULT_THEME, 'bento')">
      {{ tr("Réinitialiser (Bento)", "Reset (Bento)") }}
    </button>

    <!-- Background images -->
    <div class="atz-palette-title mt-5">{{ tr("Images de fond", "Background images") }}</div>
    <div v-for="slot in BG_SLOTS" :key="slot.id" class="mb-3">
      <div class="atz-palette-sub">{{ tr(slot.label, slot.labelEn) }}</div>
      <div class="atz-bgs">
        <button
          v-for="bg in BUILTIN_BACKGROUNDS"
          :key="bg.id"
          type="button"
          class="atz-bg"
          :class="{ 'is-active': backgrounds[slot.id] === bg.id }"
          :style="{ backgroundImage: `url(${bg.url})` }"
          :title="tr(bg.label, BG_NAMES_EN[bg.id] ?? bg.label)"
          @click="setBackground(slot.id, bg.id)"
        >
          <span>{{ tr(bg.label, BG_NAMES_EN[bg.id] ?? bg.label) }}</span>
        </button>
        <!-- images imported earlier, kept to be picked again -->
        <button
          v-for="(up, i) in bgUploads"
          :key="up"
          type="button"
          class="atz-bg"
          :class="{ 'is-active': backgrounds[slot.id] === up }"
          :style="{ backgroundImage: `url(${backgroundUrl(up)})` }"
          :title="tr('Ton image', 'Your image')"
          @click="setBackground(slot.id, up)"
        >
          <span>{{ tr("Ton image", "Your image") }} {{ i + 1 }}</span>
          <i
            class="atz-bg-x fas fa-times"
            :title="tr('Retirer cette image de la liste', 'Remove this image from the list')"
            @click.stop="removeUpload(up)"
          ></i>
        </button>
        <button
          type="button"
          class="atz-bg atz-bg-plain"
          :class="{ 'is-active': backgrounds[slot.id] === 'none' }"
          @click="setBackground(slot.id, 'none')"
        >
          <span>{{ tr("Aucune", "None") }}</span>
        </button>
        <label class="atz-bg atz-bg-plain" :title="tr('Choisir une image sur le PC', 'Pick an image on this PC')">
          <span><i class="fas fa-upload"></i> {{ tr("Importer…", "Import…") }}</span>
          <input
            type="file"
            accept="image/*"
            class="hidden"
            @change="importBackground(slot.id, $event)"
          />
        </label>
      </div>
    </div>

    <!-- Name and icon of the overlay -->
    <div class="atz-palette-title mt-5">{{ tr("Nom et icône de l'overlay", "Overlay name and icon") }}</div>
    <div class="atz-palette-sub">{{ tr("Nom affiché", "Displayed name") }}</div>
    <input
      class="rounded bg-gray-900 px-2 py-1 w-full mb-1"
      maxlength="40"
      :value="brandName"
      placeholder="Atziri Exchange"
      @input="typedBrandName(($event.target as HTMLInputElement).value)"
    />
    <p class="text-gray-500 text-sm mb-3">
      {{ tr("Icône près de l'horloge, fenêtre détachée et logo de Shift + Espace. Le raccourci du bureau garde le nom installé.", "Tray icon, detached window and Shift + Space logo. The desktop shortcut keeps the installed name.") }}
    </p>
    <div class="atz-palette-sub">{{ tr("Icône", "Icon") }}</div>
    <div class="atz-icons">
      <button
        v-for="p in BRAND_ICON_PRESETS"
        :key="p.id"
        type="button"
        class="atz-icon"
        :class="{ 'is-active': brand.icon === p.id }"
        :title="tr(p.fr, p.en)"
        @click="setBrand({ icon: p.id })"
      >
        <img :src="p.url" alt="" />
        <span>{{ tr(p.fr, p.en) }}</span>
      </button>
      <button
        v-for="(up, i) in bgUploads"
        :key="up"
        type="button"
        class="atz-icon"
        :class="{ 'is-active': brand.icon === up }"
        @click="setBrand({ icon: up })"
      >
        <img :src="brandIconUrl(up)" alt="" />
        <span>{{ tr("Ton image", "Your image") }} {{ i + 1 }}</span>
      </button>
      <label class="atz-icon" :title="tr('Choisir une image sur le PC', 'Pick an image on this PC')">
        <i class="fas fa-upload"></i>
        <span>{{ tr("Importer…", "Import…") }}</span>
        <input type="file" accept="image/*" class="hidden" @change="importBrandIcon($event)" />
      </label>
    </div>
  </div>
  </div>
</template>

<script lang="ts">
export default {
  name: "Atziri réglage",
};
</script>

<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useI18n } from "vue-i18n";
import UiRadio from "@/web/ui/UiRadio.vue";
import UiCheckbox from "@/web/ui/UiCheckbox.vue";
import UiErrorBox from "@/web/ui/UiErrorBox.vue";
import UiItemImg from "@/web/ui/UiItemImg.vue";
import HotkeyInput from "./HotkeyInput.vue";
import HotkeysGeneric, { HotkeySchema } from "./HotkeysGeneric.vue";
import {
  configProp,
  configModelValue,
  _configModelValue,
  findWidget,
} from "./utils";
import { AppConfig } from "@/web/Config";
import type { PriceCheckWidget } from "@/web/overlay/interfaces";
import type { ItemCheckWidget } from "../item-check/widget";
import { useLeagues } from "../background/Leagues";
import { usePoeninja } from "../background/Prices";
import {
  THEME_PRESETS,
  DEFAULT_THEME,
  themeColors,
  setTheme,
  customThemes,
  addCustomTheme,
  removeCustomTheme,
  themeNames,
  renameTheme,
  activeTheme,
  type CustomTheme,
  type ThemeColors,
} from "../atziri-theme";
import {
  SKINS,
  activeSkin,
  setSkin,
  skinFx,
  setSkinFx,
  ORNAMENTS,
  SKIN_AMBIENTS,
  toggleAmbient,
  styleOrnaments,
  styleAmbients,
  ornamentFor,
  setOrnament,
  TINT_PALETTE,
  ornTintFor,
  setOrnTint,
  ornTintFilter,
  STYLE_PALETTE,
  styleTintFor,
  setStyleTint,
  stylePreview,
} from "../atziri-skin";
import {
  BUILTIN_BACKGROUNDS,
  backgrounds,
  backgroundUrl,
  setBackground,
  bgUploads,
  addUpload,
  removeUpload,
  type BgSlot,
} from "../atziri-backgrounds";
import { brand, setBrand, brandIconUrl, BRAND_ICON_PRESETS } from "../atziri-brand";
import { Host } from "@/web/background/IPC";
import { tr, isFrench, dateLocale } from "@/web/atziri-lang";
import {
  exportBackup,
  readBackup,
  importBackup,
  type ParsedBackup,
} from "@/web/overlay/atziri-backup";

const props = defineProps(configProp());

const COLOR_FIELDS: Array<{ key: keyof ThemeColors; label: string; labelEn: string }> = [
  { key: "accent", label: "Accent (doré)", labelEn: "Accent (gold)" },
  { key: "bg", label: "Fond", labelEn: "Background" },
  { key: "surface", label: "Panneaux", labelEn: "Panels" },
  { key: "line", label: "Bordures", labelEn: "Borders" },
  { key: "fg", label: "Texte", labelEn: "Text" },
  { key: "muted", label: "Texte secondaire", labelEn: "Secondary text" },
];
const THEME_NAMES_EN: Record<string, string> = {
  bento: "Bento",
  braise: "Temple",
  sang: "Ritual",
  violet: "Purple",
};
const BG_NAMES_EN: Record<string, string> = {
  temple: "Atziri's Temple",
  reine: "Queen Atziri",
};

// --- Item and mod lists updates (main process routes /atziri-data/*) ---
interface DataStatus {
  appVersion?: string;
  atziriVersion?: string;
  atziriUpdate?: { build: number; url: string } | null;
  upstream?: { version: string; url: string } | null;
  pendingApply?: boolean;
  enabled: boolean;
  checking: boolean;
  lastError: string | null;
  lastCheck: number;
  langs: Record<string, { updatedAt: number; items: number; stats: number; active: boolean }>;
}
const dataStatus = shallowRef<DataStatus | null>(null);
const dataBusy = shallowRef(false);

async function loadDataStatus() {
  try {
    dataStatus.value = await (await fetch("/atziri-data/status")).json();
  } catch {
    // dev mode: no main-process routes
  }
}
loadDataStatus();

// ornaments and ambient effects offered for the current style ("custom" gets all of them)
const ornamentChoices = computed(() => {
  // skinFx is read so the list follows the settings
  void skinFx.value;
  return styleOrnaments(activeSkin.value)
    .map((id) => ORNAMENTS.find((o) => o.id === id))
    .filter((o): o is (typeof ORNAMENTS)[number] => !!o);
});
const currentOrnament = computed(() => {
  void skinFx.value;
  return ornamentFor(activeSkin.value);
});
// images per second of the ambient effects
const FPS_CHOICES = [
  { v: 30, fr: "30 (léger)", en: "30 (light)" },
  { v: 60, fr: "60", en: "60" },
  { v: 0, fr: "Max", en: "Max" },
] as const;

// color of the ornament (for each style)
const TINT_MODES = [
  { id: "none", fr: "Couleurs d'origine", en: "Original colors" },
  { id: "hue", fr: "Teinte", en: "Hue" },
  { id: "color", fr: "Couleur", en: "Color" },
] as const;
const currentTint = computed(() => {
  void skinFx.value;
  return ornTintFor(activeSkin.value);
});
const tintFilter = computed(() => ornTintFilter(currentTint.value));
// color of the style (for each style that has its own colors)
const currentStyleTint = computed(() => {
  void skinFx.value;
  return styleTintFor(activeSkin.value);
});
const activeSkinHasColors = computed(() => !!SKINS.find((s) => s.id === activeSkin.value)?.colors);
const skinPreviews = computed(() => {
  void skinFx.value;
  return Object.fromEntries(SKINS.map((s) => [s.id, stylePreview(s)])) as Record<string, [string, string]>;
});
// corner of the picked ornament, for the preview (drawn ornaments show the accent color)
const ornPreviewImg = computed(() => {
  const id = currentOrnament.value;
  if (id.startsWith("pack-")) return `/images/packs/${id.slice(5)}/coin-haut-gauche.svg`;
  const m = /^orn-([a-z]+)-([a-z]+)$/.exec(id);
  return m ? `/images/packs/${m[1]}/${m[2]}/coin-haut-gauche.svg` : "";
});
const ambientChoices = computed(() => {
  const list = styleAmbients(activeSkin.value);
  if (!SKINS.find((s) => s.id === activeSkin.value)?.custom) return list;
  // custom: the name of the style before each effect
  return list.map((a) => {
    const owner = SKINS.find((s) => SKIN_AMBIENTS[s.id]?.some((x) => x.id === a.id));
    return owner ? { ...a, fr: `${owner.fr} · ${a.fr}`, en: `${owner.en} · ${a.en}` } : a;
  });
});
const activeAmbients = computed(() => (skinFx.value.ambients[activeSkin.value] ?? []).slice(-1));

const currentLangData = computed(
  () => dataStatus.value?.langs[props.config.language],
);

async function dataAction(action: "check" | "reset") {
  dataBusy.value = true;
  try {
    dataStatus.value = await (
      await fetch(`/atziri-data/${action}`, { method: "POST" })
    ).json();
  } catch {
    // ignore
  } finally {
    dataBusy.value = false;
  }
}

// --- Start with the game (main process route /atziri-autostart) ---
const autostart = shallowRef<{ supported: boolean; enabled: boolean } | null>(
  null,
);
async function loadAutostart(on?: boolean) {
  try {
    const res = await fetch(
      on == null ? "/atziri-autostart" : `/atziri-autostart?on=${on ? 1 : 0}`,
      { method: on == null ? "GET" : "POST" },
    );
    autostart.value = await res.json();
  } catch {
    // dev mode: no main-process routes
  }
}
loadAutostart();
function setAutostart(on: boolean) {
  loadAutostart(on);
}

async function applyNow() {
  dataBusy.value = true;
  try {
    await fetch("/atziri-data/apply", { method: "POST" });
  } catch {
    dataBusy.value = false;
  }
}

async function setDataEnabled(on: boolean) {
  try {
    dataStatus.value = await (
      await fetch(`/atziri-data/enable?on=${on ? 1 : 0}`, { method: "POST" })
    ).json();
  } catch {
    // ignore
  }
}

function dayTime(t: number) {
  return new Date(t).toLocaleString(dateLocale(), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Background images
const BG_SLOTS: Array<{ id: BgSlot; label: string; labelEn: string }> = [
  { id: "hub", label: "Shift + Espace", labelEn: "Shift + Space" },
  { id: "price", label: "Vérification du prix", labelEn: "Price check" },
];

// Themes saved by the player: colors and background images
const savingTheme = shallowRef(false);
const themeName = shallowRef("");
const themeNameEl = shallowRef<HTMLInputElement | null>(null);
function startSaveTheme() {
  themeName.value = `${tr("Mon thème", "My theme")} ${customThemes.value.length + 1}`;
  savingTheme.value = true;
  setTimeout(() => themeNameEl.value?.select(), 0);
}
function saveTheme() {
  if (!themeName.value.trim()) return;
  addCustomTheme(themeName.value, { ...backgrounds.value });
  savingTheme.value = false;
}
const renamingTheme = shallowRef<string | null>(null);
const renameText = shallowRef("");
function startRenameTheme(id: string, name: string) {
  renamingTheme.value = id;
  renameText.value = name;
}
function doRenameTheme() {
  if (renamingTheme.value == null) return;
  renameTheme(renamingTheme.value, renameText.value);
  renamingTheme.value = null;
}
function useCustomTheme(ct: CustomTheme) {
  setTheme(ct.colors, String(ct.id));
  for (const slot of ["hub", "price"] as BgSlot[]) {
    const v = ct.backgrounds?.[slot];
    if (v) setBackground(slot, v);
  }
}

// Name and icon of the overlay
const brandName = shallowRef(brand.value.name);
let brandTimer: ReturnType<typeof setTimeout> | undefined;
function typedBrandName(v: string) {
  brandName.value = v;
  clearTimeout(brandTimer);
  brandTimer = setTimeout(() => {
    setBrand({ name: v.trim() || "Atziri Exchange" }).catch(() => undefined);
  }, 500);
}
async function importBrandIcon(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const name = await Host.importFile(file);
    addUpload(`upload:${name}`);
    await setBrand({ icon: `upload:${name}` });
  } finally {
    input.value = "";
  }
}

async function importBackground(slot: BgSlot, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const name = await Host.importFile(file);
    addUpload(`upload:${name}`);
    setBackground(slot, `upload:${name}`);
  } finally {
    input.value = "";
  }
}

// Palette: click a color row, then a swatch
const selectedField = shallowRef<keyof ThemeColors>("accent");
const selectedLabel = computed(
  () => {
    const f = COLOR_FIELDS.find((f) => f.key === selectedField.value);
    return f ? tr(f.label, f.labelEn) : "";
  },
);
// light/vivid colors for accent and text, dark ones for backgrounds/borders
const BRIGHT_SWATCHES = [
  "#d8a24f", "#e8c46a", "#f0d48a", "#c97a3a", "#e07b4f", "#d24b40",
  "#e2654f", "#ff8a5c", "#e7707a", "#d9584a", "#b8475e", "#c06cc4",
  "#c3b8e8", "#8f86e0", "#6aa8e8", "#4fb3d8", "#56c9a6", "#6cc086",
  "#9cc46f", "#c8d36a", "#ebdfc6", "#dde9e3", "#f1e3df", "#e6e4ee",
  "#ffffff", "#d0c8b8", "#a8977b", "#8ea79f", "#b49a96", "#9a97ab",
];
const DARK_SWATCHES = [
  "#0e0c0a", "#0a1110", "#110909", "#0f0f13", "#000000", "#121212",
  "#1f1914", "#121c1b", "#1c1012", "#18181f", "#1a1a1a", "#14181f",
  "#2a2119", "#16241f", "#2a1418", "#22222c", "#262626", "#1b2230",
  "#3b3025", "#264039", "#45232a", "#34333f", "#3a3a3a", "#2c3a52",
  "#5a4632", "#2f5a4c", "#5e2a33", "#4a4860", "#555555", "#3d4f6e",
];
const swatches = computed(() =>
  ["bg", "surface", "line"].includes(selectedField.value)
    ? DARK_SWATCHES
    : BRIGHT_SWATCHES,
);

function setColor(key: keyof ThemeColors, value: string) {
  setTheme({ ...themeColors.value, [key]: value });
}

/** the theme picked last; without one (older settings), the first theme with these colors */
function isActiveTheme(id: string, colors: ThemeColors) {
  if (!isPreset(colors)) return false;
  if (activeTheme.value) return activeTheme.value === id;
  const first =
    Object.entries(THEME_PRESETS).find(([, p]) => isPreset(p.colors))?.[0] ??
    customThemes.value.find((t) => isPreset(t.colors))?.id;
  return String(first) === id;
}
function isPreset(colors: ThemeColors) {
  return (Object.keys(colors) as Array<keyof ThemeColors>).every(
    (k) => colors[k].toLowerCase() === themeColors.value[k].toLowerCase(),
  );
}
const { t } = useI18n();

const leagues = useLeagues();
const { availableCoreCurrencies } = usePoeninja();

const priceCheck = computed(
  () => findWidget<PriceCheckWidget>("price-check", props.config)!,
);
const itemCheck = computed(
  () => findWidget<ItemCheckWidget>("item-check", props.config)!,
);

const leagueId = configModelValue(() => props.config, "leagueId");
const customLeagueId = computed<string>({
  get: () =>
    !leagues.list.value.some((league) => league.id === props.config.leagueId)
      ? (props.config.leagueId ?? "")
      : "",
  set: (value) => {
    props.config.leagueId = value;
  },
});

const language = computed<typeof props.config.language>({
  get() {
    return props.config.language;
  },
  set(value) {
    props.config.language = value;
    AppConfig().language = value;
    if (value !== "cmn-Hant") {
      props.config.realm = "pc-ggg";
    }
  },
});

const searchStatRange = computed<number>({
  get() {
    return priceCheck.value.searchStatRange;
  },
  set(value) {
    if (typeof value !== "number") return;
    if (value >= 0 && value <= 50) {
      priceCheck.value.searchStatRange = value;
    }
  },
});

const coreCurrency = configModelValue(() => priceCheck.value, "coreCurrency");
const rememberCurrency = configModelValue(
  () => priceCheck.value,
  "rememberCurrency",
);
const tooltipHover = configModelValue(
  () => priceCheck.value,
  "itemHoverTooltip",
);
const poedbKey = configModelValue(() => itemCheck.value, "poedbKey");
const farmKey = configModelValue(() => itemCheck.value, "atziriFarmKey");
const pobKey = configModelValue(() => itemCheck.value, "atziriPobKey");
const craftPauseKey = configModelValue(() => itemCheck.value, "atziriCraftPauseKey");
const runeKey = configModelValue(() => itemCheck.value, "atziriRuneKey");
const wellKey = configModelValue(() => itemCheck.value, "atziriWellKey");

const priceCheckHotkeys = computed<HotkeySchema[]>(() => [
  {
    translationKey: "price_check.name",
    items: [
      {
        translationKey: "price_check.hotkey",
        config: {
          modKey: _configModelValue(priceCheck.value, "hotkeyHold"),
          nonModKey: _configModelValue(priceCheck.value, "hotkey"),
        },
      },
      {
        translationKey: "price_check.hotkey_locked",
        config: _configModelValue(priceCheck.value, "hotkeyLocked"),
      },
    ],
  },
]);

// ---- backup of Farm > Setup and craft methods ----
const backupBusy = shallowRef(false);
const backupMsg = shallowRef("");
const backupError = shallowRef(false);
const backupPending = shallowRef<ParsedBackup | null>(null);
async function doExport() {
  backupBusy.value = true;
  backupError.value = false;
  try {
    const n = await exportBackup();
    backupMsg.value = tr(
      `Exporté : ${n.setups} fiche(s) Setup, ${n.methods} méthode(s). Le fichier est dans tes Téléchargements.`,
      `Exported: ${n.setups} Setup card(s), ${n.methods} method(s). The file is in your Downloads.`,
    );
  } catch {
    backupError.value = true;
    backupMsg.value = tr("L'export a échoué.", "The export failed.");
  } finally {
    backupBusy.value = false;
  }
}
async function pickBackup(e: Event) {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = "";
  if (!f) return;
  backupMsg.value = "";
  const b = await readBackup(f);
  if (!b) {
    backupError.value = true;
    backupMsg.value = tr("Ce fichier n'est pas une sauvegarde Atziri.", "This file is not an Atziri backup.");
    return;
  }
  backupPending.value = b;
}
async function doImport() {
  const b = backupPending.value;
  if (!b) return;
  backupBusy.value = true;
  backupError.value = false;
  try {
    await importBackup(b);
    backupMsg.value = tr(
      `Importé : ${b.setups} fiche(s) Setup, ${b.methods} méthode(s).`,
      `Imported: ${b.setups} Setup card(s), ${b.methods} method(s).`,
    );
  } catch {
    backupError.value = true;
    backupMsg.value = tr("L'import a échoué.", "The import failed.");
  } finally {
    backupBusy.value = false;
    backupPending.value = null;
  }
}
</script>

<style lang="postcss">
.atz-bgs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.atz-bg {
  position: relative;
  height: 52px;
  border-radius: 6px;
  border: 1px solid theme("colors.gray.700");
  background-size: cover;
  background-position: center;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: flex-end;

  span {
    width: 100%;
    font-size: 11px;
    padding: 2px 6px;
    background: rgb(var(--c-gray-900) / 0.75);
    text-align: left;
  }

  &:hover {
    border-color: theme("colors.blue.400");
  }

  &.is-active {
    border-color: theme("colors.blue.400");
    box-shadow: 0 0 0 1px theme("colors.blue.400");
  }
}

.atz-custom {
  position: relative;
}
.atz-rename {
  width: 7rem;
  padding: 0 4px;
  border-radius: 3px;
  background: theme("colors.gray.900");
  color: theme("colors.gray.100");
}
.atz-custom-x {
  margin-left: 4px;
  font-size: 9px;
  opacity: 0.5;
}
.atz-custom-x:hover {
  opacity: 1;
  color: #d9584a;
}

.atz-bg-x {
  position: absolute;
  top: 3px;
  right: 4px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgb(var(--c-gray-900) / 0.85);
  color: theme("colors.gray.300");
  font-size: 9px;
  line-height: 16px;
  text-align: center;
  display: none;
}
.atz-bg:hover .atz-bg-x {
  display: block;
}
.atz-bg-x:hover {
  color: #d9584a;
}

.atz-icons {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.atz-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 6px 2px 4px;
  border-radius: 6px;
  border: 1px solid theme("colors.gray.700");
  background: theme("colors.gray.800");
  cursor: pointer;
  font-size: 10.5px;

  img {
    width: 30px;
    height: 30px;
    object-fit: contain;
  }
  i {
    font-size: 16px;
    line-height: 30px;
  }
  &:hover {
    border-color: theme("colors.blue.400");
  }
  &.is-active {
    border-color: theme("colors.blue.400");
    box-shadow: 0 0 0 1px theme("colors.blue.400");
  }
}

.atz-bg-plain {
  align-items: center;
  background: theme("colors.gray.800");

  span {
    background: transparent;
    text-align: center;
  }
}

.atz-upstream {
  padding: 6px 8px;
  border: 1px solid theme("colors.blue.400");
  border-radius: 6px;
  color: theme("colors.gray.200");
  background: rgb(var(--c-blue-900) / 0.6);
}

.atz-palette {
  width: 17rem;
  flex: none;
  margin-left: auto;
  padding: 12px 14px;
  border: 1px solid theme("colors.gray.700");
  border-radius: 8px;
  background: rgb(var(--c-gray-900) / 0.6);
}

.atz-palette-title {
  font-family: "Space Grotesk", "Inter", Georgia, serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: theme("colors.blue.400");
  margin-bottom: 10px;
}

.atz-palette-sub {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: theme("colors.gray.400");
  margin-bottom: 6px;
}

/* Visual style cards: a small framed preview of each style */
.atz-skin-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.atz-skin-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid theme("colors.gray.700");
  background: theme("colors.gray.800");
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    border-color: theme("colors.blue.400");
  }

  &.is-active {
    border-color: theme("colors.blue.400");
    box-shadow: 0 0 10px rgb(var(--c-blue-400) / 0.35);
  }
}

.atz-skin-preview {
  position: relative;
  display: block;
  height: 64px;
  border-radius: 8px;
  background: var(--p-bg);
  border: 1px solid #2a2a2a;
  overflow: hidden;
}

.atz-skin-bar {
  position: absolute;
  left: 10px;
  top: 12px;
  width: 38%;
  height: 8px;
  border-radius: 3px;
  background: var(--p-accent);
}

.atz-skin-line {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 30px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.14);
}

.atz-skin-line--short {
  top: 42px;
  right: 40%;
}

.atz-skin-preview--neon {
  border: 2px solid var(--p-accent);
  box-shadow:
    0 0 8px var(--p-accent),
    inset 0 0 12px color-mix(in srgb, var(--p-accent) 45%, transparent);

  & .atz-skin-bar {
    background: linear-gradient(90deg, var(--p-accent), #6a5cff);
    box-shadow: 0 0 8px var(--p-accent);
  }
}

.atz-skin-preview--darkred {
  border: 2px solid var(--p-accent);
  border-radius: 3px;
  box-shadow:
    0 0 8px color-mix(in srgb, var(--p-accent) 70%, transparent),
    inset 0 0 16px #5a0a0e;

  & .atz-skin-bar {
    border-radius: 1px;
    background: linear-gradient(90deg, var(--p-accent), #5a0a0e);
  }
}

.atz-skin-preview--cyber {
  border: 2px solid var(--p-accent);
  border-radius: 2px;
  background:
    repeating-linear-gradient(0deg, color-mix(in srgb, var(--p-accent) 14%, transparent) 0 1px, transparent 1px 10px),
    repeating-linear-gradient(90deg, color-mix(in srgb, var(--p-accent) 14%, transparent) 0 1px, transparent 1px 10px),
    var(--p-bg);
  box-shadow: 0 0 8px var(--p-accent);

  & .atz-skin-bar {
    border-radius: 0;
    box-shadow: 0 0 6px var(--p-accent);
  }
}

.atz-skin-preview--minimal {
  border: 1px solid #2f2f31;

  & .atz-skin-bar {
    opacity: 0.75;
  }
}

.atz-skin-preview--nature {
  border: 2px solid #6f8f2a;
  border-radius: 10px;
  background:
    radial-gradient(60% 60% at 0% 0%, rgba(156, 204, 60, 0.35), transparent 70%),
    radial-gradient(60% 60% at 100% 100%, rgba(92, 74, 36, 0.6), transparent 70%),
    var(--p-bg);
  box-shadow: inset 0 0 14px rgba(92, 74, 36, 0.6);
}

.atz-skin-preview--custom {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--p-bg), var(--p-bg)) padding-box,
    conic-gradient(from 210deg, #c04dff, #19d3ff, #9ccc3c, #f5a524, #e3262f, #c04dff) border-box;
}
.atz-skin-preview--custom .atz-skin-bar {
  background: linear-gradient(90deg, #c04dff, #19d3ff, #9ccc3c, #f5a524);
}

.atz-skin-preview--glass {
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  background:
    linear-gradient(160deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.03) 60%),
    radial-gradient(80% 90% at 80% 20%, color-mix(in srgb, var(--p-accent) 45%, transparent), transparent 70%),
    var(--p-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

/* ornament list and its color, side by side */
.atz-orn-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px 18px;
}

.atz-style-col {
  flex: 1 1 420px;
  min-width: 0;
}

.atz-tint.atz-tint--style {
  flex: 1 1 290px;
}

.atz-orn-col {
  flex: 1 1 240px;
  min-width: 0;
}

.atz-tint {
  flex: 1 1 300px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid theme("colors.gray.700");
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.atz-tint-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.atz-tint-preview {
  flex: none;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  background:
    linear-gradient(135deg, rgb(var(--c-blue-400)) 0 40%, transparent 40%),
    linear-gradient(315deg, rgb(var(--c-blue-400) / 0.55) 0 22%, transparent 22%),
    #0d0d0d;
  border: 1px solid theme("colors.gray.700");
  overflow: hidden;

  & img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
}

.atz-tint-preview--img {
  background: #0d0d0d;
}

.atz-preset.atz-preset--sm {
  padding: 2px 8px;
  font-size: 12px;
}

.atz-tint-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.atz-tint-swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid theme("colors.gray.700");
  cursor: pointer;
  transition: transform 0.12s;

  &:hover {
    transform: scale(1.12);
  }

  &.is-active {
    border-color: theme("colors.gray.100");
    box-shadow: 0 0 0 2px theme("colors.blue.400");
  }
}

.atz-tint-row {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr) 3.2rem;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  & input[type="range"] {
    accent-color: theme("colors.blue.400");
  }
}

.atz-tint-colors {
  display: flex;
  gap: 16px;

  & label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: theme("colors.gray.300");
    cursor: pointer;
  }

  & input[type="color"] {
    width: 34px;
    height: 24px;
    padding: 0;
    border: 1px solid theme("colors.gray.600");
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }
}

/* extra look settings under the style cards */
.atz-fx {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid theme("colors.gray.700");
}

.atz-fx-row {
  display: grid;
  grid-template-columns: 13rem minmax(0, 1fr) 3.5rem;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.atz-fx-row input[type="range"] {
  accent-color: theme("colors.blue.400");
}

.atz-fx-label {
  font-size: 13px;
  color: theme("colors.gray.300");
}

.atz-fx-hint {
  font-size: 12.5px;
  color: theme("colors.gray.500");
  margin: 0;
}

.atz-fx-val {
  font-size: 12.5px;
  text-align: right;
  color: theme("colors.gray.400");
  font-variant-numeric: tabular-nums;
}

.atz-skin-name {
  font-size: 12.5px;
  text-align: center;

  & .fa-check {
    color: theme("colors.blue.400");
    margin-right: 2px;
  }
}

.atz-preset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid theme("colors.gray.700");
  background: theme("colors.gray.800");
  font-size: 12.5px;

  &:hover {
    border-color: theme("colors.blue.400");
  }

  &.is-active {
    border-color: theme("colors.blue.400");
    color: theme("colors.blue.400");
  }
}

.atz-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid;
  display: inline-block;
}

.atz-swatches {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 4px;
}

.atz-swatch {
  aspect-ratio: 1;
  border-radius: 5px;
  border: 1px solid rgb(255 255 255 / 0.12);
  cursor: pointer;

  &:hover {
    transform: scale(1.12);
  }

  &.is-active {
    outline: 2px solid theme("colors.blue.400");
    outline-offset: 1px;
  }
}

.atz-color {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 6px;
  margin: 0 -6px;
  border-radius: 5px;
  border: 1px solid transparent;
  cursor: pointer;

  &.is-selected {
    border-color: theme("colors.blue.400");
    background: theme("colors.blue.900");
  }

  input[type="color"] {
    width: 34px;
    height: 24px;
    padding: 0;
    border: 1px solid theme("colors.gray.700");
    border-radius: 4px;
    background: transparent;
    cursor: pointer;
  }
}

.atz-hex {
  font-family: "IBM Plex Mono", ui-monospace, Consolas, monospace;
  font-size: 12px;
  color: theme("colors.gray.400");
}
</style>