'use strict'

// important variables used in the app
const path = require('path')
const fs = require('fs-extra')
const http = require('http')
const i18n = require('i18n')
const os = require('os')
const PKJSON = require('package.json')

// default settings
const Settings = {
  player: {
    centered: true,
    fullscreen: false,
    sub_size: 40,
    sub_color: '#ffffff',
    sub_auto: false,
    contrast: 5,
    saturation: 2,
    multimonitor: false,
    monitor: 1
  },
  apikeys: JSON.parse(atob('eyJ0cmFrdF9pZCI6ImY3YjY1MjhhYzhiY2IzNjc0MjJhZWU1M' +
    'WNlYjkwZDg2ZDdlMzcyYzMyNzljMDQ1NGIyYTk2ZTEzZGQzYTc1NDIiLCJ0cmFrdF9zZWNyZ' +
    'XQiOiI5MTY3NWM2M2NjNzljOTRkYzE1NzliNTExMjVjMmQwYjA5NTQ5MDFjMmFjZTA0ODNlZ' +
    'DQzN2Q1NDBjMjg2OWZhIiwiZmFuYXJ0IjoiMjVkNjAwNzVjYjVmNTk4Mjg0ZjU1OGRjZmYzN' +
    'ThkNzQiLCJ0bWRiIjoiMjcwNzUyODJlMzllZWE3NmJkOTYyNmVlNWQzZTc2N2IiLCJvcGVuc' +
    '3VidGl0bGVzIjoibXFmSEJKeWtPU0w1VVBsSDA4MWtKeTJTdWlxcUNrU1QiLCJvbWRiIjoiY' +
    'jI3Y2FlN2MiLCJ0dmRiIjoiYTlkYWQ0ODItMjhmYi00ZTRjLTg1YTgtNGY2MjExZmM2YmMzIn0='
  )),
  streamer: {
    magnetTimeout: 10000,
    maxConns: 40,
    downloadLimit: 0,
    uploadLimit: 0,
    announce: [ //get qbittorrent list: console.log(Settings.streamer.announce.join('\n'))
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://tracker.torrent.eu.org:451/announce',
      'udp://open.stealth.si:80/announce',
      'udp://tracker.dler.org:6969/announce',
      'udp://tracker.flatuslifir.is:6969/announce',
      'udp://tracker.plx.im:6969/announce',
      'udp://tracker.srv00.com:6969/announce',
      'udp://tracker.opentorrent.top:6969/announce',
      'udp://tracker.torrust-demo.com:6969/announce',
      'udp://tracker.fnix.net:6969/announce',
      'udp://tracker.tryhackx.org:6969/announce',
      'udp://tracker.qu.ax:6969/announce',
      'udp://vito-tracker.duckdns.org:6969/announce',
      'udp://udp.tracker.projectk.org:23333/announce',
      'udp://tracker.dler.org:6969/announce',
      'udp://tracker.gmi.gd:6969/announce',
      'udp://wepzone.net:6969/announce',
      'udp://open.demonii.com:1337/announce',
      'udp://tracker-udp.gbitt.info:80/announce',
      'udp://tracker.t-1.org:6969/announce',
      'udp://leet-tracker.moe:1337/announce',
      'udp://tracker.bittor.pw:1337/announce',
      'udp://p4p.arenabg.com:1337/announce',
    ]
  },
  supportedVideoFiles: ['.mkv', '.avi', '.mp4', '.m4v', '.mts', '.m2ts', '.ts'],
  grid: {
    mainSmall: { sm: 4, md: 4, lg: 3 },
    mainNormal: { sm: 6, md: 6, lg: 4 },
    historySmall: { sm: 2, md: 2, lg: 1 },
    historyNormal: { sm: 3, md: 3, lg: 2 }
  }
}
