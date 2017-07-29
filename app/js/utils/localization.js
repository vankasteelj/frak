'use strict';

const Localization = {

    // cache
    availableLocales: ['en'],
    detectedLocale: false,

    // STARTUP: load i18n and set locales, then localize app
    setupLocalization: () => {
        // find if one of the available locales is the same as user environment
        Localization.detectLocale();

        // init i18n engine
        i18n.configure({
            defaultLocale: Localization.detectedLocale,
            locales: Localization.availableLocales,
            directory: './app/localization',
            updateFiles: true
        });

        // set lang to stored or detected one
        i18n.setLocale(localStorage.locale || Localization.detectedLocale);

        // localize HTML
        Localization.localizeApp();
    },

    // AUTO: autodetect lang based on OS information
    detectLocale: () => {
        // The full OS language (with localization, like 'en-uk')
        const pureLanguage = navigator.language.toLowerCase();
        // The global language name (without localization, like 'en')
        const baseLanguage = navigator.language.toLowerCase().slice(0, 2);

        if ($.inArray(pureLanguage, Localization.availableLocales) !== -1) {
            Localization.detectedLocale = pureLanguage;
        } else if ($.inArray(baseLanguage, Localization.availableLocales) !== -1) {
            Localization.detectedLocale = baseLanguage;
        } else {
            Localization.detectedLocale = 'en';
        }
    },

    // AUTO: translate the HTML based on <i18n> tags and .i18n classes
    localizeApp: () => {
        console.info('Using locale:', i18n.getLocale());

        const t = document.getElementsByTagName('i18n');
        const c = document.getElementsByClassName('i18n');

        for (let i = 0; i < t.length; i++) {
            if (t[i].innerText) {
                t[i].innerText = i18n.__(t[i].innerText);
            }
        }
        for (let j = 0; j < c.length; j++) {
            if (c[j].title) {
                c[j].title = i18n.__(c[j].title);
            }
            if (c[j].placeholder) {
                c[j].placeholder = i18n.__(c[j].placeholder);
            }
        }
    },

    // STARTUP: build dropdown menu for changing app localization
    setupDropdown: () => {
        // build dropdown
        for (let i in Localization.availableLocales) {
            // insert element in dropdown
            let lang = Localization.availableLocales[i];
            $('#app-language').append('<option value="'+lang+'">'+lang+'</option>');

            // select if active
            if (lang === i18n.getLocale()) {
                $('#app-language').val(lang);
            }
        }

        // on dropdown click, change lang
        $('#app-language').on('change', (e) => {
            // store new lang
            localStorage.locale = e.target.value;
            // reload to use new lang
            win.reload();
        });
    },
};