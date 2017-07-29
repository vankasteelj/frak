'use strict';

const Notify = {
    // top-right notification sliding
    snack: (message, duration = 2500) => {
        $('#notification-snack')
            .html(message)
            .show()
            .addClass('slideNotification')
            .delay(duration)
            .queue(() => $('#notification-snack').html('').hide('fast').removeClass('slideNotification').dequeue());
    }, 

    // request attention when in bg
    requestAttention: () => {
        if (document.hasFocus()) {
            return;
        }

        win.requestAttention(true);
        win.once('focus', () => win.requestAttention(false));
    }
};