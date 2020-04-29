'use strict'

const Themes = {
  setup: () => {
    // build settings dropdown & import stylesheets
    fs.readdir('./app/css/themes', (err, files = []) => {
      if (err) console.error(err)
      for (const i in files) {
        const theme = files[i].slice(0, -4)
        $('head').append(`<link rel="stylesheet" type="text/css" href="${path.join('./css/themes', files[i])}">`)
        $('#theme').append(`<option value="${theme}">${i18n.__(theme)}</option>`)
      }
    })

    // on dropdown click, change lang
    $('#theme').on('change', (e) => {
      Themes.apply(e.target.value)
    })

    // apply style at startup
    Themes.apply(DB.get('theme'))
  },

  apply: (theme = 'dark') => {
    console.info('Apply theme:', theme)
    DB.store(theme, 'theme')
    document.documentElement.className = theme
    setTimeout(() => $('#theme').val(theme), 0)
  }
}
