'use strict';

const Settings = {
    apikeys: function () { 
        return JSON.parse(
            atob('eyJ0cmFrdF9pZCI6ImY3YjY1MjhhYzhiY2IzNjc0Mj'+
                 'JhZWU1MWNlYjkwZDg2ZDdlMzcyYzMyNzljMDQ1NGIy'+
                 'YTk2ZTEzZGQzYTc1NDIiLCJ0cmFrdF9zZWNyZXQiOi'+
                 'I5MTY3NWM2M2NjNzljOTRkYzE1NzliNTExMjVjMmQw'+
                 'YjA5NTQ5MDFjMmFjZTA0ODNlZDQzN2Q1NDBjMjg2OW'+
                 'ZhIiwiZmFuYXJ0IjoiMjVkNjAwNzVjYjVmNTk4Mjg0'+
                 'ZjU1OGRjZmYzNThkNzQiLCJ0dmRiIjoiNDkwODNDQj'+
                 'IxNkMwMzdEMCIsInRtZGIiOiIyNzA3NTI4MmUzOWVl'+
                 'YTc2YmQ5NjI2ZWU1ZDNlNzY3YiJ9'
            )
        );
    }(),
}