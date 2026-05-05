export class MovieClient {
    constructor(movieRepository) {
        const OMDBApi = process.env.OMDB_API;
        this.url = `http://www.omdbapi.com/?apikey=${OMDBApi}&i=`;

        this.movieRepository = movieRepository;

        this.cache = new Map();
    }

    loadToCacheFromDatabase() {
        const rawMovies = this.movieRepository.getAllMovies();

        for (const rawMovie of rawMovies) {
            const movieJson = JSON.parse(rawMovie.json);
            this.addToCache(rawMovie.omdb_id, movieJson);
        }
    }

    addToCache(omdb_id, json) {
        this.cache.set(omdb_id, { json, cachedAt: Date.now() });
    }

    addToDatabase(omdb_id, movieJson) {
        this.movieRepository.insertMovie(omdb_id, movieJson);
    }

    idInCache(omdb_id) {
        return this.cache.has(omdb_id);
    }

    async fetchById(omdb_id) {
        const response = await fetch(this.url + omdb_id);

        if (!response.ok) return;

        const json = await response.json();

        this.addToCache(omdb_id, json);
        this.addToDatabase(omdb_id, json);

        return { json, cachedAt: Date.now() };
    }

    async fetchWithCacheByMovieId(omdb_id) {
        if (this.cache.has(omdb_id)) {
            return this.cache.get(omdb_id);
        }
        return await this.fetchById(omdb_id);
    }
}
