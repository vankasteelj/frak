'use strict'

const Notify = {
  // top-right notification sliding
  snack: (message, duration = 3500) => {
    const $snack = $('#notification-snack')

    if ($snack.is(':visible')) {
      setTimeout(() => Notify.snack(message, duration), 500)
      return
    }

    $snack
      .html(message)
      .show()
      .addClass('slideNotification')
      .delay(duration)
      .queue(() => $snack
        .hide('fast')
        .removeClass('slideNotification')
        .dequeue())
  }
}
