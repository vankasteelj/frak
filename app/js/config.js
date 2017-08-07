'use strict';

// important variables used in the app
const gui = require('nw.gui');
const win = gui.Window.get();
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const spawn = require('child_process').spawn;
const https = require('https');
const crypt = require('crypto');
const i18n = require('i18n');
const PKJSON = require('../package.json');

const Settings = {
    apikeys: function () { 
        return JSON.parse(
            atob('eyJ0cmFrdF9pZCI6ImY3YjY1MjhhYzhiY2IzNjc0MjJhZWU1MWNlYjkwZ'+
                 'Dg2ZDdlMzcyYzMyNzljMDQ1NGIyYTk2ZTEzZGQzYTc1NDIiLCJ0cmFrdF'+
                 '9zZWNyZXQiOiI5MTY3NWM2M2NjNzljOTRkYzE1NzliNTExMjVjMmQwYjA'+
                 '5NTQ5MDFjMmFjZTA0ODNlZDQzN2Q1NDBjMjg2OWZhIiwiZmFuYXJ0Ijoi'+
                 'MjVkNjAwNzVjYjVmNTk4Mjg0ZjU1OGRjZmYzNThkNzQiLCJ0dmRiIjoiN'+
                 'DkwODNDQjIxNkMwMzdEMCIsInRtZGIiOiIyNzA3NTI4MmUzOWVlYTc2Ym'+
                 'Q5NjI2ZWU1ZDNlNzY3YiIsIm9wZW5zdWJ0aXRsZXMiOiJmcmFrIn0='
            )
        );
    }(),
}