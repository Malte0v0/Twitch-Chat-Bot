import { event } from "./utils/events.js";

const MAX_32_BIT = 2147483647;

export class Scheduler {
    constructor() {
        this._jobs = new Map();
    }

    addJob(job, triggerTime) {
        const delay = triggerTime - Date.now();
        if (delay < 0) {
            this._jobIsDue(job);
        } else {
            this._createJob(job, delay);
        }
    }

    removeJob(job) {
        this._jobs.delete(job);
    }

    getJobs() {
        return this._jobs;
    }

    _createJob(job, delay) {
        const timeout = setTimeout(
            async () => {
                if (delay > MAX_32_BIT) {
                    this._createJob(job, delay - MAX_32_BIT);
                } else {
                    try {
                        this._jobIsDue(job);
                    } catch (error) {
                        console.error("Error in createJob", error);
                    }
                }
            },
            Math.min(delay, MAX_32_BIT),
        );
        this._jobs.set(job, timeout);
    }

    _jobIsDue(job) {
        event.emit("job_due", job);
        this.removeJob(job);
    }
}
