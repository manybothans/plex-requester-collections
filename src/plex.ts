import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

// Plex API Docs used to build this available at
// https://www.plexopedia.com/plex-media-server/api/library/movie-update/
// Docs are incomplete, but good starting point. I had to do some reverse engineering.

/*
create dumb collection
/library/collections
type=1&
title=Test3&
smart=0&
sectionId=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730&
    server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/metadata/32730&


X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en
*/

/*
create dumb colleciton
/library/collections

type=1&
title=Test5&
smart=0&
sectionId=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730%2C32694%2C30503&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/metadata/32730,32694,30503&

X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en

*/

/*

create smart collection
/library/collections

type=1&
title=Test4&
smart=1&
sectionId=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fsections%2F1%2Fall%3Ftype%3D1%26sort%3DtitleSort%26label%3D139932&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/sections/1/all?type=1&sort=titleSort&label=139932&

X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en
*/

/*
create smart collection
/library/collections

type=2&
title=Test6&
smart=1&
sectionId=2&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fsections%2F2%2Fall%3Ftype%3D2%26sort%3DaddedAt%253Adesc%26push%3D1%26show.year%3D2023%26and%3D1%26show.unwatchedLeaves%3D1%26pop%3D1%26and%3D1%26show.label%3D137662&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/sections/2/all?
type=2&
sort=addedAt%3Adesc&
push=1&
show.year=2023&
and=1&
show.unwatchedLeaves=1&
pop=1&
and=1&
show.label=137662&

X-Plex-Product=Plex%20Web&
X-Plex-Version=4.100.1&
X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&
X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&
X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&
X-Plex-Model=bundled&
X-Plex-Device=OSX&
X-Plex-Device-Name=Safari&
X-Plex-Device-Screen-Resolution=1706x845%2C5120x2160&
X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&
X-Plex-Provider-Version=6.3&
X-Plex-Text-Format=plain&
X-Plex-Drm=fairplay&
X-Plex-Language=en

*/

/*
update collection
/library/sections/1/all
type=18&id=38010&includeExternalMedia=1&titleSort.value=%21000_Boop&titleSort.locked=1&
X-Plex-Product=Plex%20Web&X-Plex-Version=4.100.1&X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&X-Plex-Platform=Safari&
X-Plex-Platform-Version=16.4&X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&X-Plex-Model=bundled&
X-Plex-Device=OSX&X-Plex-Device-Name=Safari&X-Plex-Device-Screen-Resolution=1706x1269%2C5120x2160&X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&X-Plex-Language=en
*/

/*
delete colleciton
/library/collections/38023
DELETE
X-Plex-Product=Plex%20Web&X-Plex-Version=4.100.1&X-Plex-Client-Identifier=49kxnd12vqluqvr6ih8ztbio&X-Plex-Platform=Safari&X-Plex-Platform-Version=16.4&X-Plex-Features=external-media%2Cindirect-media%2Chub-style-list&X-Plex-Model=bundled&X-Plex-Device=OSX&X-Plex-Device-Name=Safari&X-Plex-Device-Screen-Resolution=1706x2032%2C5120x2160&X-Plex-Token=UbrsJBKcpBEbwXCjG4Fm&X-Plex-Language=en&X-Plex-Drm=fairplay&X-Plex-Text-Format=plain&X-Plex-Provider-Version=5.1
*/

// I found these using browser dev console, haven't found the others.
const PlexTypes = {
	MOVIE: 1,
	SERIES: 2,
	COLLECTION: 18
};

type PlexCollectionOptions = {
	sectionId: number;
	title: string;
	titleSort?: string;
	mediaIds?: Array<number>;
	itemType: number;
	sort?: string;
	query: string;
};

/**
 * This is the top-level PlexAPI singleton object.
 */
const PlexAPI = {
	/**
	 * Unique ID for the Plex server intance, needed for creating collections.
	 */
	MachineId: "",
	/**
	 * This API command is used to get the capabilities of the Plex Media server.
	 * The capabilities returned include such items as the settings of the Plex server,
	 * the operating system, and the version of Plex that is installed.
	 */
	getCapabilities: async function () {
		const data = await this.callApi({ url: "/" });
		this.debug(data);
		return data;
	},
	/**
	 * This method returns the Machine ID for the current Plex Media Server intances.
	 * If we haven't gotten the ID yet, it makes an API call to get it before returning.
	 *
	 * @return {Promise<string>} Promise resolving to the string Machine ID.
	 */
	getMachineId: async function () {
		if (!this.MachineId) {
			const data = await this.getCapabilities();

			// If the returned object has the right fields, grab the identifier
			this.MachineId =
				data &&
				data.MediaContainer &&
				data.MediaContainer.machineIdentifier
					? data.MediaContainer.machineIdentifier
					: "";
		}
		this.debug(this.MachineId);
		return this.MachineId;
	},
	/**
	 * Plex goes between using the string codes and number codes, need to get one from the other
	 */
	getPlexTypeCode: function (typeString: string) {
		switch (typeString) {
			case "show":
				return PlexTypes.SERIES;
			case "movie":
				return PlexTypes.MOVIE;
			case "collection":
				return PlexTypes.COLLECTION;
		}
		return PlexTypes.MOVIE;
	},
	// You can easily retrieve the information about all libraries AKA sections that are available on a Plex server using this API command.
	getSections: async function () {
		const data = await this.callApi({ url: "/library/sections" });
		const sections =
			data && data.MediaContainer && data.MediaContainer.Directory
				? data.MediaContainer.Directory
				: [];
		this.debug(sections);
		return sections;
	},
	// The API command described here can return the information for each account setup on the Plex server.
	getCollections: async function (sectionId: number) {
		const data = await this.callApi({
			url: `/library/sections/${sectionId}/collections`,
			params: {
				includeCollections: 1,
				includeExternalMedia: 1
			}
		});
		const collections =
			data && data.MediaContainer && data.MediaContainer.Metadata
				? data.MediaContainer.Metadata
				: [];
		this.debug(collections);
		return collections;
	},
	// Create a smart collection based on a query of metadata fields.
	// Browser Inpector on Plex is your friend for building these queries. Advanced Filter >> Save As Collection
	createSmartCollection: async function (options: PlexCollectionOptions) {
		const machineId = await PlexAPI.getMachineId();
		options.sort = options.sort ? options.sort : "titleSort";
		// options.query = options.query ? options.query : "unwatched%3D1";// default to unwatched = true

		// TO DO This one was kind of a finicky query. Just copying their exact string for now, will come back and simplify.
		// Looks like you can't set titleSort in this command
		const data = await this.callApi({
			url: `/library/collections?type=${options.itemType}&title=${options.title}&smart=1&uri=server%3A%2F%2F${machineId}%2Fcom.plexapp.plugins.library%2Flibrary%2Fsections%2F${options.sectionId}%2Fall%3Ftype%3D${options.itemType}%26sort%3D${options.sort}%26${options.query}&sectionId=${options.sectionId}`,
			method: "post"
		});

		// Need to do a second call to set titleSort, if we want to.
		if (options.titleSort && options.titleSort != options.title) {
			// Get the ID of the newly created collection from the response of previous request.
			const collectionKey = data?.MediaContainer?.Metadata?.length
				? data.MediaContainer.Metadata[0].ratingKey
				: undefined;

			// Update the collection's titleSort field.
			const result = await this.updateItemDetails(
				options.sectionId,
				collectionKey,
				{
					type: PlexTypes.COLLECTION,
					"titleSort.value": encodeURIComponent(options.titleSort),
					"titleSort.locked": 1
				}
			);
			this.debug(result);
		}

		this.debug(data?.MediaContainer?.Metadata);
		return data?.MediaContainer?.Metadata;
	},
	// The API command described here can return the information for each account setup on the Plex server.
	getAccounts: async function () {
		const data = await this.callApi({ url: "/accounts" });
		const accounts =
			data && data.MediaContainer && data.MediaContainer.Account
				? data.MediaContainer.Account
				: [];
		this.debug(accounts);
		return accounts;
	},
	// Each Plex server can have multiple accounts created for different users. Information about a single account can be returned using this API command.
	getSingleAccount: async function (accountId: number) {
		const data = await this.callApi({ url: "/accounts/" + accountId });
		const account =
			data &&
			data.MediaContainer &&
			data.MediaContainer.Account &&
			data.MediaContainer.Account[0]
				? data.MediaContainer.Account[0]
				: undefined;
		this.debug(account);
		return account;
	},
	// Get a list of all the labels for this library section, along with label key.
	getLabels: async function (sectionId: number) {
		const data = await this.callApi({
			url: `/library/sections/${sectionId}/label`
		});
		// this.debug(data);
		const labels =
			data && data.MediaContainer && data.MediaContainer.Directory
				? data.MediaContainer.Directory
				: [];
		this.debug(labels);
		return labels;
	},
	/**
	 * Get a list of all the labels for this library section, along with label key.
	 */
	getKeyForLabel: async function (sectionId: number, label: string) {
		const labels = await this.getLabels(sectionId);
		let labelKey: number;

		// Find the specific label in the array and return the corresponding key, otherwise return undefined.
		if (label && labels && _.isArray(labels) && !_.isEmpty(labels)) {
			const labelObj = _.find(labels, { title: label });
			labelKey = labelObj && labelObj.key ? labelObj.key : undefined;
		}
		this.debug(labelKey);
		return labelKey;
	},
	// Alias helper funtion to simplify adding labels to movies.
	addLabelToMovie: async function (
		sectionId: number,
		movieId: number,
		label: string
	) {
		return this.updateItemDetails(sectionId, movieId, {
			"label[0].tag.tag": encodeURIComponent(label),
			"label.locked": 1,
			type: PlexTypes.MOVIE
		});
	},
	// Alias helper funtion to simplify adding labels to collecitons.
	addLabelToCollection: async function (
		sectionId: number,
		collectionId: number,
		label: string
	) {
		return this.updateItemDetails(sectionId, collectionId, {
			"label[0].tag.tag": encodeURIComponent(label),
			"label.locked": 1,
			type: PlexTypes.COLLECTION
		});
	},
	// Returns an array of all the top-level media items (Movies or TV Shows) in a given Section AKA Library.
	getAllItems: async function (sectionId: number) {
		const data = await this.callApi({
			url: `/library/sections/${sectionId}/all`
		});
		// this.debug(data);
		const items =
			data && data.MediaContainer && data.MediaContainer.Metadata
				? data.MediaContainer.Metadata
				: [];
		this.debug(items);
		return items;
	},
	// The movie metadata can be updated from the Plex API. This can be useful if you wish to perform a bulk update to movies in a library.
	updateItemDetails: async function (
		sectionId: number,
		itemId: number,
		updates
	) {
		updates = updates || {};
		updates.type = updates.type || PlexTypes.MOVIE;
		updates.id = itemId;
		updates.includeExternalMedia = 1;

		const data = await this.callApi({
			url: `/library/sections/${sectionId}/all`,
			method: "put",
			params: updates
		});
		this.debug(data);
		return data;
	},
	// Abstracted API calls to Plex, adds URL and API Key automatically.
	callApi: async function (requestObj: AxiosRequestConfig) {
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.PLEX_URL;
			requestObj.method = requestObj.method || "get";
			requestObj.params = requestObj.params || {};
			requestObj.params["X-Plex-Token"] = process.env.PLEX_TOKEN;

			const response: AxiosResponse = await axios.request(requestObj);
			// this.debug(response);

			return response.data;
		} catch (error) {
			console.error(error);
			return null;
		}
	},
	debug: function (data) {
		if (process.env.NODE_ENV == "development") {
			console.log(data);
		}
	}
};

export default PlexAPI;
