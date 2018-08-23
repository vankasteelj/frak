'use strict'

const Gamepad = {
    API: {
        controller: {},
        connect: (e) => {
            Gamepad.API.controller = e.gamepad;
            console.log('Gamepad (id:%d) connected:', e.gamepad.index, e.gamepad.id);
        },
        disconnect: (e) => {
            delete Gamepad.API.controller;
            console.log('Gamepad disconnected');
        },
        buttonPressed: (button, hold) => {
            let newPress = false;
            // loop through pressed buttons
            for (let i = 0, s = Gamepad.API.buttonsStatus.length; i < s; i++) {
                // if we found the button we're looking for...
                if (Gamepad.API.buttonsStatus[i] == button) {
                    // set the boolean variable to true
                    newPress = true;
                    // if we want to check the single press
                    if (!hold) {
                        // loop through the cached states from the previous frame
                        for (let j = 0, p = Gamepad.API.buttonsCache.length; j < p; j++) {
                            // if the button was already pressed, ignore new press
                            if (Gamepad.API.buttonsCache[j] == button) {
                                newPress = false;
                            }
                        }
                    }
                }
            }
            return newPress;
        },
        buttons: [ // xbox-360 layout
            'A', 'B', 'X', 'Y',
            'LB', 'RB', 'LT', 'RT',
            'Back', 'Start',
            'Axis-L', 'Axis-R', 
            'Up', 'Down', 'Left', 'Right',
            'SUPER'
        ],
        buttonsCache: [],
        buttonsStatus: [],
        axesStatus: []
    },
    init: () => {
        window.addEventListener('gamepadconnected', Gamepad.API.connect);
        window.addEventListener('gamepaddisconnected', Gamepad.API.disconnect);
        setInterval(Gamepad.update, 100);
    },

    update: function() {
        Gamepad.API.buttonsCache = [];
        for (let k = 0; k < Gamepad.API.buttonsStatus.length; k++) {
            Gamepad.API.buttonsCache[k] = Gamepad.API.buttonsStatus[k];
        }
        Gamepad.API.buttonsStatus = [];
        let c = Gamepad.API.controller || {};
        let pressed = [];
        if (c.buttons) {
            for (let b = 0, t = c.buttons.length; b < t; b++) {
                if(c.buttons[b].pressed) {
                    pressed.push(Gamepad.API.buttons[b]);
                }
            }
        }

        let axes = [];
        if (c.axes) {
            for (let a = 0, x = c.axes.length; a < x; a++) {
                axes.push(c.axes[a].toFixed(2));
            }
        }

        Gamepad.API.axesStatus = axes;
        Gamepad.API.buttonsStatus = pressed;

        navigator.getGamepads();

        if (Gamepad.API.axesStatus[0] > 0.5) console.log('Left axe: right');
        if (Gamepad.API.axesStatus[0] < -0.5) console.log('Left axe: left');
        if (Gamepad.API.axesStatus[1] > 0.5) console.log('Left axe: down');
        if (Gamepad.API.axesStatus[1] < -0.5) console.log('Left axe: up');

        if (Gamepad.API.axesStatus[2] > 0.5) console.log('Right axe: right');
        if (Gamepad.API.axesStatus[2] < -0.5) console.log('Right axe: left');
        if (Gamepad.API.axesStatus[3] > 0.5) console.log('Right axe: down');
        if (Gamepad.API.axesStatus[3] < -0.5) console.log('Right axe: up');

        if (Gamepad.API.buttonPressed('A')) console.log('Pressed A');
        if (Gamepad.API.buttonPressed('B')) console.log('Pressed B');
        if (Gamepad.API.buttonPressed('Y')) console.log('Pressed Y');
        if (Gamepad.API.buttonPressed('X')) console.log('Pressed X');
        if (Gamepad.API.buttonPressed('Start')) console.log('Pressed Start');
        if (Gamepad.API.buttonPressed('Back')) console.log('Pressed Back');
        if (Gamepad.API.buttonPressed('SUPER')) console.log('Pressed SUPER');
        if (Gamepad.API.buttonPressed('LB')) console.log('Pressed LB');
        if (Gamepad.API.buttonPressed('RB')) console.log('Pressed RB');
        if (Gamepad.API.buttonPressed('LT')) console.log('Pressed LT');
        if (Gamepad.API.buttonPressed('RT')) console.log('Pressed RT');
        if (Gamepad.API.buttonPressed('Up')) console.log('Pressed Up');
        if (Gamepad.API.buttonPressed('Down')) console.log('Pressed Down');
        if (Gamepad.API.buttonPressed('Left')) console.log('Pressed Left');
        if (Gamepad.API.buttonPressed('Right')) console.log('Pressed Right');
        if (Gamepad.API.buttonPressed('Axis-L')) console.log('Pressed Axis-L');
        if (Gamepad.API.buttonPressed('Axis-R')) console.log('Pressed Axis-R');
    }
}