'use strict'

const Subtitles = {
  client: new (require('opensubtitles.com'))({
    apikey: Settings.apikeys.opensubtitles,
    useragent: PKJSON.releaseName + ' v' + PKJSON.version
  }),

  getData: (elm) => {
    // extract json from data div
    const id = $(elm)[0].id
    const data = JSON.parse($(`#${id}`).find('.data').text())

    return data
  },

  search: (opts) => {
    console.info('Looking for subtitles', opts)
    return Subtitles.client.subtitles(opts).then(subs => {
      const ordered = {}
      for (const sub of subs.data) {
        // find lang
        const langcode = sub.attributes.language
        const lang = require('langs').where('1', langcode)
        if (!ordered[langcode]) ordered[langcode] = []
        ordered[langcode].push({
          id: sub.attributes.files[0].file_id,
          lang: lang ? lang.name : langcode,
          langcode: langcode,
          filename: sub.attributes.files[0].file_name
        })
      }
      return ordered
    })
  },

  addSubtitles: (subs, lang) => {
    if (lang === 'null') return // Opensubtitles sometimes sends back "null" as a language

    const language = `<div class="sublanguage i18n" title="${i18n.__('Select this language')}">` +
                `<div class="sublang" onClick="Subtitles.expand('${lang}')">${Localization.nativeNames[lang] || subs[0].lang}</div>` +
                `<div class="sublangmenu" id="sub-${lang}"></div>` +
            '</div>'

    $('#subtitles .subs').append(language)

    for (const n in subs) {
      const id = subs[n].id
      if ($(`#${id}`)[0]) continue

      const subtitle = `<div class="sub i18n" title="${i18n.__('Load this subtitle')}" id="${id}" onClick="Subtitles.select(this)">` +
                    `<div class="data">${JSON.stringify(subs[n])}</div>` +
                    `<div class="subname">${subs[n].filename}</div>` +
                '</div>'
      $(`#sub-${lang}`).append(subtitle)

      if (document.getElementById(id).offsetWidth < document.getElementById(id).scrollWidth) {
        $(`#${id}`).addClass('scrolltext')
      }
    }

    $('.sublangmenu').hide()
  },
  expand: (lang) => {
    const $elm = $(`#sub-${lang}`)
    $elm.is(':visible') ? $elm.hide() : $elm.show()
  },
  select: (elm) => {
    const sub = Subtitles.getData(elm)
    const id = sub.id

    const subtitle = path.join(Cache.dir, sub.filename + id)

    const selectSubtitle = () => {
      Player.mpv.addSubtitles(subtitle, 'cached', sub.filename, sub.langcode)
      $('#subtitles .sub').removeClass('active')
      $(`#${id}`).addClass('active')

      console.info('Subtitle selected:', sub.langcode)
    }

    if (fs.existsSync(subtitle)) {
      selectSubtitle()
    } else {
      Subtitles.client.download({
        file_id: parseInt(id),
        sub_format: 'srt',
        file_name: sub.filename + id
      }).then(response => {
        require('got').stream(response.link).pipe(fs.createWriteStream(subtitle)).on('finish', selectSubtitle)
      })
    }
  },
  defaultLanguage: () => {
    const langs = require('langs')
    const available = langs.all()
    const defaultsublocale = DB.sync.get('defaultsublocale')

    for (const i in available) {
      // insert element in dropdown
      const native = available[i].local
      const lang2B = available[i]['2B']
      $('#sub-language').append('<option value="' + lang2B + '">' + native + '</option>')

      // select if active
      if (defaultsublocale === lang2B) {
        $('#sub-language').val(lang2B)
      }
    }

    if (!defaultsublocale) {
      const lang2B = langs.where('1', i18n.getLocale())['2B']
      $('#sub-language').val(lang2B)
      DB.sync.store(lang2B, 'defaultsublocale')
    }

    // on dropdown click, change lang
    $('#sub-language').on('change', (e) => {
      // store new lang
      DB.sync.store(e.target.value, 'defaultsublocale')
      // reload to use new lang
      Player.setMPV()
    })
  },
  opensubLogin: (username, password, retry = false) => {
    if (!username) username = $('#opensub_login').val()
    if (!password) password = $('#opensub_password').val()

    if (!username || !password) {
      console.error('You need a username & password to log in to Opensubtitles.com')
      Notify.snack('You need a username & password to log in to Opensubtitles.com')
      return
    }

    Subtitles.client.login({
      username: username,
      password: password
    }).then((res) => {
      DB.sync.store(username, 'os_username')
      DB.sync.store(password, 'os_password')
      Subtitles.opensubLogged(username, res)
    }).catch((err) => {
      console.error('Opensubtitles.com login error', err)
      if (err.message && err.message.match('429')) {
        if (retry) {
          DB.sync.store(username, 'os_username')
          $('#opensub_login').val(username)
          DB.sync.store(password, 'os_password')
          $('#opensub_password').val(password)
          Notify.snack(err.message || err)
        } else {
          console.log('Opensubtitles.com login... Retrying in 60 seconds')
          setTimeout(() => {
            Subtitles.opensubLogin(username, password, true)
          }, 60000)
        }
      } else {
        Notify.snack((err.message === '401 Unauthorized') ? i18n.__('Wrong username or password') : (err.message || err))
      }
    })
  },
  opensubLogged: (username, res) => {
    $('#oslogin').hide()
    $('#oslogout').show()
    $('#oslogout .username').text(username + ' (ID: ' + res.user.user_id + ')')
    console.info('Logged in Opensubtitles.com')
  },
  opensubLogout: () => {
    DB.sync.remove('os_username')
    DB.sync.remove('os_password')
    Subtitles.client.logout()
    Subtitles.client._authentication = {}

    $('#oslogout .username').text('')
    $('#opensub_login').val('')
    $('#opensub_password').val('')

    $('#oslogout').hide()
    $('#oslogin').show()
    console.info('Logged out of Opensubtitles.com')
  },
  opensubReLogin: () => {
    const username = DB.sync.get('os_username')
    const password = DB.sync.get('os_password')
    if (!username || !password) return

    Subtitles.opensubLogin(username, password)
  }
}
