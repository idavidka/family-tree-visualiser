import localforage from "localforage";
import { type State } from "../store/main/reducers";

export default class IndexedDbManager<T> {
	store: LocalForage;
	cache?: Record<string, () => Promise<T>>;

	constructor(name: string, storeName: string) {
		this.store = localforage.createInstance({
			name,
			storeName,
			driver: localforage.INDEXEDDB,
		});
	}

	clearCache() {
		this.cache = undefined;
	}

	async getItem(key: string) {
		return await this.store.getItem<T>(key);
	}

	async getAllItems() {
		if (this.cache) {
			return this.cache;
		}

		if (!this.cache) {
			this.cache = {};
		}

		await this.store.iterate<T, unknown>((value, key) => {
			if (value) {
				this.cache![key] = async () =>
					await new Promise<T>((resolve) => {
						this.getItem(key).then((item) => {
							setTimeout(() => {
								resolve(item as T);
							}, 10);
						});
					});
			}
		});

		return this.cache;
	}

	toBeSet: Record<string, unknown> = {};
	setItemsTimer?: NodeJS.Timeout;

	private async setNextItem(flow = false, index = 0) {
		const [nextKey, nextValue] =
			Object.entries(this.toBeSet).find(([_, v]) => !!v) ?? [];

		if (!nextKey || !nextValue) {
			return;
		}

		const response = await this.store.setItem(nextKey, nextValue);

		delete this.toBeSet[nextKey];

		if (flow) {
			return await new Promise((resolve) => {
				if (!this.setItemsTimer) {
					this.setItemsTimer = setTimeout(() => {
						this.setNextItem(flow, index + 1).then(resolve);
					}, 100);
				}
			});
		}

		return response;
	}

	async setItem(key: string, value: T) {
		if (!this.cache) {
			this.cache = {};
		}

		if (value) {
			this.cache[key] = async () => await Promise.resolve<T>(value);

			this.toBeSet[key] = value;

			this.setNextItem(true);
		}
	}
}

type IndexedMainDbType = "Main";
export type IndexedDbType = "Ancestry" | "MyHeritage";

type InstanceCacheType = "kinship" | "path";
type InstanceImageType = "images";

const instances: Partial<
	Record<
		| `${IndexedDbType}-${InstanceImageType}`
		| `${IndexedMainDbType}-${InstanceCacheType}`,
		IndexedDbManager<unknown>
	>
> = {};

export const getInstance = <T>(
	name: string,
	storeName: IndexedMainDbType | IndexedDbType,
	dataType: InstanceCacheType | InstanceImageType
) => {
	const store = `${storeName}-${dataType}` as keyof typeof instances;
	if (!instances[store]) {
		instances[store] = new IndexedDbManager<T>(name, store);
	}

	return instances[store] as IndexedDbManager<T>;
};

let migrationInstance: IndexedDbManager<State> | undefined;
export const getMigrationInstance = () => {
	if (!migrationInstance) {
		migrationInstance = new IndexedDbManager<State>("ftv-main", "state");
	}

	return migrationInstance;
};
