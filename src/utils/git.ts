/* eslint-disable max-len */

const commitPath = {
	"github.com": "commit",
	"bitbucket.org": "commits",
};

export const getCommitsPath = (url: string) => {
	const groups = url.match(
		/^(git@?|https:\/\/(.*@)?)(?<host>[^:/]+)(:|\/)(?<path>(.*))\.git/
	)?.groups as undefined | { host: keyof typeof commitPath; path: string };

	if (!groups) {
		return undefined;
	}
	return `https://${groups.host}/${groups.path}/${
		commitPath[groups.host] || "commits"
	}`;
};
