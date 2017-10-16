'use strict';

const Misc = {

    // AUTO or USERINTERACTION: open url in browser or file explorer
    openExternal: (link) => gui.Shell.openExternal(link),

    // USERINTERACTION: restart app (used by Keyboard.setupShortcuts)
    restartApp: () => {
        Cache.delete();

        const argv = gui.App.fullArgv;
        const CWD = process.cwd();

        argv.push(CWD);
        spawn(process.execPath, argv, {
            cwd: CWD,
            detached: true,
            stdio: ['ignore', 'ignore', 'ignore']
        }).unref();
        gui.App.quit();
    },

    // AUTO: build the right click menu(s) on demand
    contextMenu: (cutLabel, copyLabel, pasteLabel, field) => {
        const menu = new gui.Menu();
        const clipboard = gui.Clipboard.get();

        const cut = new gui.MenuItem({
            label: cutLabel,
            click: () => document.execCommand('cut')
        });

        const copy = new gui.MenuItem({
            label: copyLabel,
            click: () => {
                // on readonly fields, execCommand doesn't work
                if ($('#' + field).attr('readonly') && Misc.getSelection($('#' + field)[0]) === null) {
                    clipboard.set($('#' + field).val());
                } else {
                    document.execCommand('copy');
                }
            }
        });

        const paste = new gui.MenuItem({
            label: pasteLabel,
            click: () => document.execCommand('paste')
        });

        if (cutLabel) {
            menu.append(cut);
        }
        if (copyLabel) {
            menu.append(copy);
        }
        if (pasteLabel) {
            menu.append(paste);
        }

        return menu;
    },

    // AUTO: get active selection (used by Misc.contextMenu)
    getSelection: (textbox) => {
        let selectedText = null;
        const activeElement = document.activeElement;

        if (activeElement && (activeElement.tagName.toLowerCase() === 'textarea' || (activeElement.tagName.toLowerCase() === 'input' && activeElement.type.toLowerCase() === 'text')) && activeElement === textbox) {
            const startIndex = textbox.selectionStart;
            const endIndex = textbox.selectionEnd;

            if (endIndex - startIndex > 0) {
                const text = textbox.value;
                selectedText = text.substring(textbox.selectionStart, textbox.selectionEnd);
            }
        }

        return selectedText;
    },

    // AUTO: function to always return 2 digits, adding leading 0 if needed
    pad: (n) => n < 10 ? '0' + n : n,

    // AUTO: checks if the element is visible (for scrolling)
    elementInViewport: (container, element) => {
        if (element.length === 0) {
            return;
        }
        const $container = $(container);
        const $el = $(element);

        const docViewTop = $container.offset().top;
        const docViewBottom = docViewTop + $container.height();

        const elemTop = $el.offset().top;
        const elemBottom = elemTop + $el.height();

        return ((elemBottom >= docViewTop) && (elemTop <= docViewBottom) && (elemBottom <= docViewBottom) && (elemTop >= docViewTop));
    },

    // AUTO: capitalize first letter
    capitalize: (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    slugify: (title) => title.replace(/\W+/g, '-').toLowerCase(),
    percentage: (n) => parseInt(n*10),
    numberWithCommas: (x) => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, i18n.__('NUM_COMMA')),

    fileSize: (num) => {
        if (isNaN(num)) {
            return;
        }

        num = parseInt(num) || 0;

        let exponent, unit, units, base;
        let neg = num < 0;

        switch (require('os').platform()) {
            case 'linux':
                base = 1024;
                units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
                break;
            case 'win32':
                base = 1024;
                units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
                break;
            case 'darwin':
                /* falls through */
            default:
                base = 1000;
                units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        }

        if (neg) {
            num = -num;
        }

        if (num < 1) {
            unit = units[0];
            return (neg ? '-' : '') + num + ' ' + unit;
        }

        exponent = Math.min(Math.floor(Math.log(num) / Math.log(base)), units.length - 1);
        num = (num / Math.pow(base, exponent)).toFixed(2) * 1;
        unit = units[exponent];

        return (neg ? '-' : '') + num + ' ' + unit;
    }
};