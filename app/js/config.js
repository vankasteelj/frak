'use strict'

// important variables used in the app
const gui = require('nw.gui')
const win = gui.Window.get()
const path = require('path')
const fs = require('fs-extra')
const zlib = require('zlib')
const spawn = require('child_process').spawn
const https = require('https')
const http = require('http')
const localforage = require('localforage')
const url = require('url')
const dns = require('dns')
dns.setDefaultResultOrder('ipv4first') // force ipv4 use for nodejs (see: https://forum.opensubtitles.org/viewtopic.php?f=8&t=17963)
const crypt = require('crypto')
const i18n = require('i18n')
const got = require('got')
const os = require('os')
const PKJSON = require('../package.json')
const countryList = require('../app/js/vendor/ISO3166-1.alpha2.json')

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
  apikeys: (function () {
    return JSON.parse(
      atob('eyJ0cmFrdF9pZCI6ImY3YjY1MjhhYzhiY2IzNjc0MjJhZW' +
           'U1MWNlYjkwZDg2ZDdlMzcyYzMyNzljMDQ1NGIyYTk2ZTEz' +
           'ZGQzYTc1NDIiLCJ0cmFrdF9zZWNyZXQiOiI5MTY3NWM2M2' +
           'NjNzljOTRkYzE1NzliNTExMjVjMmQwYjA5NTQ5MDFjMmFj' +
           'ZTA0ODNlZDQzN2Q1NDBjMjg2OWZhIiwiZmFuYXJ0IjoiMj' +
           'VkNjAwNzVjYjVmNTk4Mjg0ZjU1OGRjZmYzNThkNzQiLCJ0' +
           'bWRiIjoiMjcwNzUyODJlMzllZWE3NmJkOTYyNmVlNWQzZT' +
           'c2N2IiLCJvcGVuc3VidGl0bGVzIjoiZnJhayIsIm9tZGIi' +
           'OiJiMjdjYWU3YyIsInR2ZGIiOiJhOWRhZDQ4Mi0yOGZiLT' +
           'RlNGMtODVhOC00ZjYyMTFmYzZiYzMifQ==')
    )
  })(),
  streamer: {
    magnetTimeout: 10000,
    maxConns: 55,
    downloadLimit: -1,
    uploadLimit: -1,
    announce: [
      'udp://tracker.coppersurfer.tk:6969/announce',
      'udp://exodus.desync.com:6969/announce',
      'udp://tracker.opentrackr.org:1337/announce',
      'udp://9.rarbg.com:2710/announce',
      'udp://tracker.publicbt.com:80/announce',
      'udp://tracker.empire-js.us:1337',
      'udp://tracker.leechers-paradise.org:6969/announce',
      'udp://tracker.pirateparty.gr:6969/announce',
      'udp://tracker.internetwarriors.net:1337/announce',
      'wss://tracker.openwebtorrent.com',
      'wss://tracker.fastcast.nz',
      'wss://tracker.btorrent.xyz',
      'http://torrent.nwps.ws/announce'
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
