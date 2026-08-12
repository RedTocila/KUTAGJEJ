/** Native attrs that discourage browser / password-manager generated passwords. */
export const passwordInputDisableSuggestions = {
  autoComplete: 'off' as const,
  inputProps: {
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'none',
    spellCheck: false,
    'data-lpignore': 'true',
    'data-1p-ignore': 'true',
    'data-bwignore': 'true',
    'data-form-type': 'other',
  },
};
