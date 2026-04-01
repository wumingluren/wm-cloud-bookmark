import { computed, watch } from 'vue'
import {
  DEFAULT_NEW_TAB_THEME_ID,
  NEW_TAB_THEME_PRESETS,
  type NewTabThemeId,
  getNewTabThemeById,
} from '../themes'
import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage'

const NEW_TAB_THEME_STORAGE_KEY = 'newtab-theme'

export function useNewTabTheme() {
  const selectedThemeId = useWebExtensionStorage<NewTabThemeId>(
    NEW_TAB_THEME_STORAGE_KEY,
    DEFAULT_NEW_TAB_THEME_ID,
  )

  watch(
    () => selectedThemeId.value,
    (themeId) => {
      if (getNewTabThemeById(themeId).id !== themeId) {
        selectedThemeId.value = DEFAULT_NEW_TAB_THEME_ID
      }
    },
    { immediate: true },
  )

  const activeTheme = computed(() => getNewTabThemeById(selectedThemeId.value))

  function setTheme(themeId: NewTabThemeId) {
    selectedThemeId.value = themeId
  }

  return {
    activeTheme,
    selectedThemeId,
    themePresets: NEW_TAB_THEME_PRESETS,
    setTheme,
  }
}
