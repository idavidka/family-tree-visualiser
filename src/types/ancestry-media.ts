export interface AncestryMedia {
	title: string;
	type: string;
	ext: string;
	width: number;
	height: number;
	category: string;
	subcategory: string;
	date: string;
	description: string;
	location: string;
	id: string;
	collectionId: number;
	url: string;
	isOwner: boolean;
	primaryPhoto: boolean;
	createdDate: string;
	owner: {
		id: string;
		date: string;
		displayName: string;
		photoURL: string;
		photoId: string;
		photoUrl: string;
	};
	orientation: "landscape" | "portrait";
	rights: {
		canLinkToTree: boolean;
		canEdit: boolean;
		canLinkToPerson: boolean;
		canLinkToFact: boolean;
		canShare: boolean;
	};
	originWebAddress: string;
	originSite: string;
	ms_params: string;
	ms_lookup_id: string;
	originalMid: string;
	tags: [
		{
			id: string;
			t: string;
			rect: { x: number; y: number; w: number; h: number };
			tgid: { v: string };
		},
	];
	metadataxml: string;
	previewUrl: string;
	meta: {
		comments: number;
		likes: number;
		private: boolean;
		liked: boolean;
		pinned: boolean;
	};
	faces: [];
}
