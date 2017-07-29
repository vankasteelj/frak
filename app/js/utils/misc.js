'use strict';

const Misc = {

    // AUTO or USERINTERACTION: open url in browser
    openExternal: (link) => gui.Shell.openExternal(link),

    // USERINTERACTION: restart app (used by Keyboard.setupShortcuts)
    restartApp: () => {
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
    }
};