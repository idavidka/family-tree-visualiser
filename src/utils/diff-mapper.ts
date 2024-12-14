/* eslint-disable @typescript-eslint/no-explicit-any */
export const deepDiffMapper = (function () {
	return {
		VALUE_CREATED: "created",
		VALUE_UPDATED: "updated",
		VALUE_DELETED: "deleted",
		VALUE_UNCHANGED: "unchanged",
		map: function (obj1?: object, obj2?: object) {
			if (this.isFunction(obj1) || this.isFunction(obj2)) {
				throw new Error(
					"Invalid argument. Function given, object expected."
				);
			}
			if (this.isValue(obj1) || this.isValue(obj2)) {
				return {
					type: this.compareValues(obj1, obj2),
					data: obj1 === undefined ? obj2 : obj1,
				};
			}

			const diff = {} as any;
			for (const k in obj1) {
				const key = k as keyof typeof obj1;
				if (this.isFunction(obj1[key])) {
					continue;
				}

				let value2;
				if (obj2?.[key as keyof typeof obj1] !== undefined) {
					value2 = obj2[key];
				}

				diff[key as keyof typeof obj1] = this.map(
					obj1[key],
					value2 as any
				);
			}
			for (const k in obj2) {
				const key = k as keyof typeof obj2;
				if (this.isFunction(obj2[key]) || diff[key] !== undefined) {
					continue;
				}

				diff[key] = this.map(undefined, obj2[key]);
			}

			return diff;
		},
		compareValues: function (value1?: object, value2?: object) {
			if (value1 === value2) {
				return this.VALUE_UNCHANGED;
			}
			if (
				value1 &&
				value2 &&
				this.isDate(value1) &&
				this.isDate(value2) &&
				value1.getTime() === value2.getTime()
			) {
				return this.VALUE_UNCHANGED;
			}
			if (value1 === undefined) {
				return this.VALUE_CREATED;
			}
			if (value2 === undefined) {
				return this.VALUE_DELETED;
			}
			return this.VALUE_UPDATED;
		},
		isFunction: function (x: any) {
			return Object.prototype.toString.call(x) === "[object Function]";
		},
		isArray: function (x: any) {
			return Object.prototype.toString.call(x) === "[object Array]";
		},
		isDate: function (x: any): x is Date {
			return Object.prototype.toString.call(x) === "[object Date]";
		},
		isObject: function (x: any) {
			return Object.prototype.toString.call(x) === "[object Object]";
		},
		isValue: function (x: any) {
			return !this.isObject(x) && !this.isArray(x);
		},
	};
})();
