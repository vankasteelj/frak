'use strict'

const Themes = {
  setup: () => {
    // apply style at startup
    Themes.apply(DB.sync.get('theme'))

    // build settings dropdown & import stylesheets
    fs.readdir('./app/css/themes', (err, files = []) => {
      if (err) console.error(err)
      for (const i in files) {
        const theme = files[i].slice(0, -4)
        $('head').append(`<link rel="stylesheet" type="text/css" href="${path.join('./css/themes', files[i])}">`)
        $('#theme').append(`<option value="${theme.replace(/\s/g, '_')}">${i18n.__(theme)}</option>`)
      }
    })

    // on dropdown click, change lang
    $('#theme').on('change', (e) => {
      Themes.apply(e.target.value)
    })
  },

  apply: (theme = 'dark') => {
    document.documentElement.className = theme
    DB.sync.store(theme, 'theme')
    console.info('Theme applied:', theme)
    requestIdleCallback(() => $('#theme').val(theme))
  }
}
