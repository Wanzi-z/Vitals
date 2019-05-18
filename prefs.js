const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Me = imports.misc.extensionUtils.getCurrentExtension();
Me.imports.helpers.polyfills;
const Convenience = Me.imports.helpers.convenience;
const Gettext = imports.gettext.domain(Me.metadata['gettext-domain']);
const _ = Gettext.gettext;
const FileModule = Me.imports.helpers.file;

const Settings = new Lang.Class({
    Name: 'Vitals.Settings',

    _init: function() {
        this._settings = Convenience.getSettings();

        this.builder = new Gtk.Builder();
        this.builder.set_translation_domain(Me.metadata['gettext-domain']);
        this.builder.add_from_file(Me.path + '/schemas/prefs.ui');

        this.widget = this.builder.get_object('prefs-container');

        this._bind_settings();

        // let contents = FileModule.getcontents('/proc/mounts');
        // let lines = contents.split("\n");

        // for (let line of Object.values(lines)) {
        //     if (line[0] != '/') continue;
        //     if (line.indexOf('/snap/') != -1) continue;
        //     global.log('*** ' + line);
        // }
    },

    // Bind the gtk window to the schema settings
    _bind_settings: function() {
        let widget;

        let sensors = [ 'show-temperature', 'show-voltage', 'show-fan',
                        'show-memory', 'show-processor', 'show-system',
                        'show-network', 'show-storage', 'use-higher-precision',
                        'alphabetize', 'hide-zeros', 'include-public-ip',
                        'show-battery' ];

        for (let key in sensors) {
            let sensor = sensors[key];

            widget = this.builder.get_object(sensor);
            widget.set_active(this._settings.get_boolean(sensor));
            widget.connect('state-set', (_, val) => {
                this._settings.set_boolean(sensor, val);
            });
        }

        sensors = [ 'position-in-panel', 'unit', 'network-speed-format' ];

        for (let key in sensors) {
            let sensor = sensors[key];

            widget = this.builder.get_object(sensor);
            widget.set_active(this._settings.get_int(sensor));
            widget.connect('changed', (widget) => {
                this._settings.set_int(sensor, widget.get_active());
            });
        }

        this._settings.bind(
            'update-time',
            this.builder.get_object('update-time'),
            'value',
            Gio.SettingsBindFlags.DEFAULT);

        let sensor = 'storage-path';
        widget = this.builder.get_object(sensor);
        widget.set_text(this._settings.get_string(sensor));
        widget.connect('changed', (widget) => {
            let text = widget.get_text();
            if (!text) text = '/';

            this._settings.set_string(sensor, text);
        });

        sensors = [ 'temperature', 'network', 'storage' ];

        for (let key in sensors) {
            let sensor = sensors[key];

            // Create dialog for intelligent autohide advanced settings
            this.builder.get_object(sensor + '-prefs').connect('clicked', Lang.bind(this, function() {
                let title = sensor.charAt(0).toUpperCase() + sensor.slice(1);
                let dialog = new Gtk.Dialog({ title: _(title + ' Preferences'),
                                              transient_for: this.widget.get_toplevel(),
                                              use_header_bar: true,
                                              modal: true });

                let box = this.builder.get_object(sensor + '_prefs');
                dialog.get_content_area().add(box);

                dialog.connect('response', Lang.bind(this, function(dialog, id) {
                    // remove the settings box so it doesn't get destroyed;
                    dialog.get_content_area().remove(box);
                    dialog.destroy();
                    return;
                }));

                dialog.show_all();
            }));
        }
    }
});

function init() {
    Convenience.initTranslations();
}

function buildPrefsWidget() {
    let settings = new Settings();
    let widget = settings.widget;

    Mainloop.timeout_add(0, () => {
        let header_bar = widget.get_toplevel().get_titlebar();
        header_bar.custom_title = settings.switcher;
        return false;
    });

    widget.show_all();
    return widget;
}
