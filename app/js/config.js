'use strict'

// important variables used in the app
const gui = require('nw.gui')
const win = gui.Window.get()
const path = require('path')
const fs = require('fs-extra')
const zlib = require('zlib')
const spawn = require('child_process').spawn
const request = require('request')
const https = require('https')
const http = require('http')
const dns = require('dns')
const crypt = require('crypto')
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
  apikeys: (function () {
    return JSON.parse(
      atob('eyJ0cmFrdF9pZCI6ImY3YjY1MjhhYzhiY2IzNjc0MjJhZWU1MWNlYjkwZDg2ZDdlMzcyYzMyNzljMDQ1NGIyYTk2ZT'+
           'EzZGQzYTc1NDIiLCJ0cmFrdF9zZWNyZXQiOiI5MTY3NWM2M2NjNzljOTRkYzE1NzliNTExMjVjMmQwYjA5NTQ5MDFj'+
           'MmFjZTA0ODNlZDQzN2Q1NDBjMjg2OWZhIiwiZmFuYXJ0IjoiMjVkNjAwNzVjYjVmNTk4Mjg0ZjU1OGRjZmYzNThkNz'+
           'QiLCJ0bWRiIjoiMjcwNzUyODJlMzllZWE3NmJkOTYyNmVlNWQzZTc2N2IiLCJvcGVuc3VidGl0bGVzIjoiZnJhayIsI'+
           'm9tZGIiOiJiMjdjYWU3YyJ9')
    )
  })(),
  streamer: {
    magnetTimeout: 10000,
    maxConns: 40,
    downloadLimit: -1,
    uploadLimit: -1,
    webSeeds: true,
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
  supportedVideoFiles: ['.mkv', '.avi', '.mp4', '.m4v', '.mts', '.m2ts', '.ts']
}
