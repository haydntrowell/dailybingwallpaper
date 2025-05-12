import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class BingWallpaperPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const settings_general = new Adw.PreferencesGroup({ title: _('Settings') });
        page.add(settings_general);

        this.#addRegionSelector(settings_general, window._settings);
        this.#addResolutionSelector(settings_general, window._settings);

        window.connect('close-request', () => {
            window._settings = null;
        });
    }

    #addRegionSelector(group, settings) {
        const regionOptions = [
            ['es-AR', 'Argentina'], ['en-AU', 'Australia'], ['de-AT', 'Austria'],
            ['nl-BE', 'Belgium'], ['pt-BR', 'Brazil'], ['en-CA', 'Canada'],
            ['es-CL', 'Chile'], ['zh-CN', 'China'], ['da-DK', 'Denmark'],
            ['fi-FI', 'Finland'], ['fr-FR', 'France'], ['de-DE', 'Germany'],
            ['zh-HK', 'Hong Kong'], ['en-IN', 'India'], ['en-ID', 'Indonesia'],
            ['it-IT', 'Italy'], ['ja-JP', 'Japan'], ['ko-KR', 'Korea'],
            ['en-MY', 'Malaysia'], ['es-MX', 'Mexico'], ['nl-NL', 'Netherlands'],
            ['en-NZ', 'New Zealand'], ['no-NO', 'Norway'], ['pl-PL', 'Poland'],
            ['en-PH', 'Philippines'], ['ru-RU', 'Russia'], ['en-ZA', 'South Africa'],
            ['es-ES', 'Spain'], ['sv-SE', 'Sweden'], ['de-CH', 'Switzerland'],
            ['zh-TW', 'Taiwan'], ['tr-TR', 'Türkiye'], ['en-GB', 'United Kingdom'],
            ['en-US', 'United States'],
        ];

        const model = new Gtk.StringList();
        for (const [, label] of regionOptions)
            model.append(label);

        const row = new Adw.ComboRow({
            title: _('Region'),
            model,
        });

        const current = settings.get_string('region') || 'en-US';
        const index = regionOptions.findIndex(([code]) => code === current);
        if (index >= 0) row.set_selected(index);

        row.connect('notify::selected', () => {
            const selectedIndex = row.get_selected();
            if (regionOptions[selectedIndex])
                settings.set_string('region', regionOptions[selectedIndex][0]);
        });

        group.add(row);
    }

    #addResolutionSelector(group, settings) {
        const resolutions = [
            '800x600', '1024x768', '1280x720', '1280x768',
            '1366x768', '1920x1080', '1920x1200', 'UHD',
        ];

        const model = new Gtk.StringList();
        resolutions.forEach(res => model.append(res));

        const row = new Adw.ComboRow({
            title: _('Resolution'),
            model,
        });

        const current = settings.get_string('resolution') || 'UHD';
        const index = resolutions.findIndex(res => res === current);
        if (index >= 0) row.set_selected(index);

        row.connect('notify::selected', () => {
            const selectedIndex = row.get_selected();
            if (resolutions[selectedIndex])
                settings.set_string('resolution', resolutions[selectedIndex]);
        });

        group.add(row);
    }
}

