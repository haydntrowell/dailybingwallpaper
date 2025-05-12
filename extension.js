import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const WALLPAPER_PATH = GLib.build_filenamev([GLib.get_user_cache_dir(), 'bing_wallpaper.jpg']);

export default class BingWallpaperExtension extends Extension {
    #settings = null;
    #httpSession = new Soup.Session();
    #regionChangedHandlerId = 0;
    #resolutionChangedHandlerId = 0;

    enable() {
        this.#settings = this.getSettings();

        this.#regionChangedHandlerId = this.#settings.connect('changed::region', () => this.#updateWallpaper(true));
        this.#resolutionChangedHandlerId = this.#settings.connect('changed::resolution', () => this.#updateWallpaper(true));

        this.#updateWallpaper();
    }

    async #updateWallpaper(force = false) {
        const now = new Date();
        const lastUpdateStr = this.#settings.get_string('last-update-timestamp');

        if (!force && lastUpdateStr) {
            const lastUpdate = new Date(lastUpdateStr);
            if (now - lastUpdate < 7200000) {
                return;
            }
        }

        const region = this.#settings.get_string('region') ?? 'en-US';
        const resolution = this.#settings.get_string('resolution') ?? 'UHD';
        const BING_URL = `https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=${region}`;

        try {
            const request = Soup.Message.new('GET', BING_URL);
            const bytes = await this.#httpSession.send_and_read_async(request, GLib.PRIORITY_DEFAULT, null);

            if (request.get_status() !== Soup.Status.OK)
                throw new Error(`Metadata request failed with status: ${request.get_status()}`);

            const responseBody = new TextDecoder('utf-8').decode(bytes.get_data());
            const data = JSON.parse(responseBody);

            const copyright = data.images[0]?.copyright;
            const rawUrl = "https://www.bing.com" + data.images[0]?.url;
            const url = rawUrl.replace(/\d+x\d+\.jpg/, `${resolution}.jpg`);

            const lastUrl = this.#settings.get_string('last-wallpaper-url');
            if (url === lastUrl) {
                this.#settings.set_string('last-update-timestamp', now.toISOString());
                return;
            }

            const imgRequest = Soup.Message.new('GET', url);
            const imgBytes = await this.#httpSession.send_and_read_async(imgRequest, GLib.PRIORITY_DEFAULT, null);

            if (imgRequest.get_status() !== Soup.Status.OK)
                throw new Error(`Image request failed with status: ${imgRequest.get_status()}`);

            const file = Gio.File.new_for_path(WALLPAPER_PATH);
            file.replace_contents_async(
                imgBytes,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null,
                (source, result) => {
                    try {
                        source.replace_contents_finish(result);

                        const fileUri = GLib.filename_to_uri(WALLPAPER_PATH, null);
                        const bgSettings = new Gio.Settings({ schema: 'org.gnome.desktop.background' });
                        bgSettings.set_string('picture-uri', fileUri);
                        bgSettings.set_string('picture-uri-dark', fileUri);

                        this.#settings.set_string('last-wallpaper-copyright', copyright);
                        this.#settings.set_string('last-wallpaper-url', url);
                        this.#settings.set_string('last-update-timestamp', now.toISOString());
                    } catch (error) {
                        console.error("[BING WALLPAPER] Failed to save wallpaper:", error);
                    }
                }
            );
        } catch (error) {
            console.error("[BING WALLPAPER] Wallpaper update failed:", error);
        }
    }

    disable() {
        if (this.#settings) {
            if (this.#regionChangedHandlerId)
                this.#settings.disconnect(this.#regionChangedHandlerId);
            if (this.#resolutionChangedHandlerId)
                this.#settings.disconnect(this.#resolutionChangedHandlerId);
        }

        this.#settings = null;
        this.#regionChangedHandlerId = 0;
        this.#resolutionChangedHandlerId = 0;
    }
}
