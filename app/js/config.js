'use strict';

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