'use strict'

// important variables used in the app
const win = gui.Window.get()
const path = require('path')
const fs = require('fs-extra')
const zlib = require('zlib')
const spawn = require('child_process').spawn
const http = require('http')
const localforage = require('localforage')
const i18n = require('i18n')
const got = require('got')
const os = require('os')

const PKJSON = require('../package.json')

// default settings
const Settings = {
  player: {
    centered: true,
    fullscreen: false,
    sub_size: 40,
    sub_color: '#ffffff',
    sub_auto: false,
    scale: 0.8,
    contrast: 5,
    saturation: 2,
    layout: 'box',
    seekbar: 'knob',
    multimonitor: false,
    monitor: 1
  },
  apikeys: JSON.parse(atob('eyJ0cmFrdF9pZCI6ImY3YjY1MjhhYzhiY2IzNjc0MjJhZWU1MWNlYjkwZDg2ZDdlMzcyYz' +
    'MyNzljMDQ1NGIyYTk2ZTEzZGQzYTc1NDIiLCJ0cmFrdF9zZWNyZXQiOiI5MTY3NWM2M2Nj' +
    'NzljOTRkYzE1NzliNTExMjVjMmQwYjA5NTQ5MDFjMmFjZTA0ODNlZDQzN2Q1NDBjMjg2OW' + 
    'ZhIiwiZmFuYXJ0IjoiMjVkNjAwNzVjYjVmNTk4Mjg0ZjU1OGRjZmYzNThkNzQiLCJ0bWRi' +
    'IjoiMjcwNzUyODJlMzllZWE3NmJkOTYyNmVlNWQzZTc2N2IiLCJvcGVuc3VidGl0bGVzIj' +
    'oibkM0UTJjRHRoR3hpWTVWR0xkTE9Nbkk2RlJkNzlBOVUiLCJvbWRiIjoiYjI3Y2FlN2Mi' +
    'LCJ0dmRiIjoiYTlkYWQ0ODItMjhmYi00ZTRjLTg1YTgtNGY2MjExZmM2YmMzIn0='
  )),
  streamer: {
    magnetTimeout: 15000,
    maxConns: 40,
    downloadLimit: 0,
    uploadLimit: 0,
    announce: [
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://exodus.desync.com:6969/announce',
      'udp://open.stealth.si:80/announce',
      'udp://tracker.dler.org:6969/announce',
      'udp://tracker.torrent.eu.org:451/announce',
      'udp://p4p.arenabg.com:1337/announce',
      'udp://tracker1.bt.moack.co.kr:80/announce',
      'udp://tracker.tiny-vps.com:6969/announce',
      'udp://opentracker.i2p.rocks:6969/announce',
      'udp://tracker.openbittorrent.com:6969/announce',
      'udp://uploads.gamecoast.net:6969/announce',
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://tracker.ccp.ovh:6969/announce',
      'udp://open.demonii.com:1337/announce',
      'udp://www.torrent.eu.org:451/announce',
      'udp://epider.me:6969/announce',
      'udp://open.u-p.pw:6969/announce',
      'udp://tamas3.ynh.fr:6969/announce',
      'udp://tracker.theoks.net:6969/announce',
      'https://tracker2.ctix.cn:443/announce',
      'https://tracker1.520.jp:443/announce'
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
