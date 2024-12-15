import { type WebStorage } from "redux-persist";

// TODO remove it once NiceGenealogy renderer merged
export default class MigrationStorage implements WebStorage {
	private hasDb?: boolean;
	private readonly from: WebStorage;
	private readonly to: WebStorage;
	private readonly fromChecker: () => Promise<boolean>;
	private readonly toChecker: () => Promise<boolean>;

	constructor(
		from: WebStorage,
		to: WebStorage,
		fromChecker: () => Promise<boolean>,
		toChecker: () => Promise<boolean>
	) {
		this.from = from;
		this.to = to;
		this.fromChecker = fromChecker;
		this.toChecker = toChecker;

		this.hasIndexedDb();
	}

	private async hasIndexedDb() {
		if (this.hasDb !== undefined) {
			console.log("[Migration][cached db state]", this.hasDb);
			return this.hasDb;
		}

		const currentFrom = await this.fromChecker();
		const currentTo = !currentFrom || (await this.toChecker());

		console.log(
			"[Migration][current db state]",
			!!currentFrom,
			!!currentTo
		);

		this.hasDb = !!currentTo;

		return this.hasDb;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async setItem(key: string, value: any) {
		if (!(await this.hasIndexedDb())) {
			this.to.setItem(key, value);
			console.log("[Migration][set in ls]");
			await this.from.setItem(key, value);
			return;
		}

		console.log("[Migration][set in idb]");
		await this.to.setItem(key, value);
	}

	async removeItem(key: string) {
		if (!(await this.hasIndexedDb())) {
			this.to.removeItem(key);

			console.log("[Migration][remove from ls]");
			await this.from.removeItem(key);
			return;
		}

		console.log("[Migration][remove from idb]");
		await this.to.removeItem(key);
	}

	async getItem(key: string) {
		if (!(await this.hasIndexedDb())) {
			console.log("[Migration][read from ls]");
			return await this.from.getItem(key);
		}

		console.log("[Migration][read from idb]");
		return await this.to.getItem(key);
	}
}
