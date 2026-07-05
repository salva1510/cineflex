// ========================================================================
// CINEFLEX CONTINUE WATCHING v1.0
// ========================================================================

class ContinueWatching {

    constructor() {
        this.profileId = localStorage.getItem("cineflex_profile");
        this.storageKey = `cineflex_continue_${this.profileId}`;
    }

    getList() {
        return JSON.parse(localStorage.getItem(this.storageKey) || "[]");
    }

    saveList(list) {
        localStorage.setItem(this.storageKey, JSON.stringify(list));
    }

    update(item) {

        if (!item || !item.id) return;

        let list = this.getList();

        list = list.filter(x => x.id !== item.id);

        list.unshift({
            id: item.id,
            title: item.title,
            poster: item.poster,
            type: item.type || "movie",
            season: item.season || null,
            episode: item.episode || null,
            currentTime: item.currentTime || 0,
            duration: item.duration || 0,
            updatedAt: Date.now()
        });

        if (list.length > 30) {
            list = list.slice(0, 30);
        }

        this.saveList(list);
    }

    get(movieId) {
        return this.getList().find(x => x.id == movieId);
    }

    remove(movieId) {

        let list = this.getList();

        list = list.filter(x => x.id != movieId);

        this.saveList(list);

    }

    clear() {

        localStorage.removeItem(this.storageKey);

    }

}

window.continueWatching = new ContinueWatching();
