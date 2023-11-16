/**
 * Contains all the methods required to interact with Plex Media Server API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @todo Define types for Plex API requests and responses.
 *
 * @remarks
 * Plex API Docs used to build this available at https://www.plexopedia.com/plex-media-server/api/
 * Docs are incomplete, but good starting point. I had to do some reverse engineering.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import https from "https";
import _ from "lodash";
import { error } from "console";

/**
 * @enum {number} Numeric codes for the different types of items in Plex. I found these using browser dev console, haven't found the others.
 */
const PlexTypes = {
	MOVIE: 1,
	SERIES: 2,
	COLLECTION: 18
};

/**
 * @typedef {Dictionary} Dictionary - Creates a new type for objects with unknown properties, e.g. responses from undocumented 3rd party APIs.
 */
interface Dictionary {
	[key: string]: unknown | Dictionary;
}

/**
 * @typedef {Object} PlexCollectionOptions - Creates a new Type for the Plex collection creation options.
 * @property {number} sectionId - The numeric ID of the Plex library section we working in.
 * @property {number} smart - (Optional) Whether to make a Smart or Dumb collection. Possible values: 0, 1. Right now only Smart is supported.
 * @property {string} title - The title for the new collection.
 * @property {string} titleSort - (Optional) The title to use for sorting, if it needs to be different that regular title.
 * @property {number} itemType - The numeric code for the type of Plex item we're going to have in this collection (eg if its for shows or movies). Codes contained in PlexTypes ENUM.
 * @property {string} sort - (Optional) How the collection should be sorted. Some options: addedAt, titleSort, title. May need to dig into browser console on Plex to find others.
 * @property {string} query - The query string for the Smart Filter query. These can be super complicated, may need to dig into browser console on Plex.
 */
interface PlexCollectionOptions {
	sectionId: number;
	smart?: number;
	title: string;
	titleSort?: string;
	itemType: number;
	sort?: string;
	query: string;
}

interface PlexTag {
	id?: number;
	filter?: string;
	tag?: string;
	tagKey?: string;
	role?: string;
	thumb?: string;
}

interface PlexGuidObj {
	id: string;
}

interface PlexSetting {
	id?: string;
	label?: string;
	summary?: string;
	type?: string;
	default?: string;
	value?: string;
	hidden?: boolean;
	advanced?: boolean;
	group?: string;
	enumValues?: string;
}

interface PlexPreferences {
	Setting?: Array<PlexSetting>;
}

interface PlexRating {
	image?: string;
	value?: number;
	type?: string;
}

interface PlexField {
	locked?: boolean;
	name?: string;
}

interface PlexLocation {
	path?: string;
}

interface PlexStream {
	id?: number;
	streamType?: number;
	default?: boolean;
	codec?: string;
	index?: number;
	bitrate?: number;
	language?: string;
	languageTag?: string;
	languageCode?: string;
	bitDepth?: number;
	chromaLocation?: string;
	chromaSubsampling?: string;
	codedHeight?: number;
	codedWidth?: number;
	colorPrimaries?: string;
	colorRange?: string;
	colorSpace?: string;
	colorTrc?: string;
	frameRate?: number;
	hasScalingMatrix?: boolean;
	height?: number;
	level?: number;
	original?: boolean;
	profile?: string;
	refFrames?: number;
	scanType?: string;
	width?: number;
	displayTitle?: string;
	extendedDisplayTitle?: string;
}

interface PlexMediaParts {
	id?: number;
	key?: string;
	duration?: number;
	file?: string;
	size?: number;
	container?: string;
	videoProfile?: string;
	Stream?: Array<PlexStream>;
}

interface PlexMedia {
	id?: number;
	duration?: number;
	bitrate?: number;
	width?: number;
	height?: number;
	aspectRatio?: number;
	audioChannels?: number;
	audioCodec?: string;
	videoCodec?: string;
	videoResolution?: string;
	container?: string;
	videoFrameRate?: string;
	videoProfile?: string;
	title?: string;
	Part?: Array<PlexMediaParts>;
}

interface PlexExtras {
	size?: number;
	Metadata?: Array<PlexMediaDetails>;
}

interface PlexOnDeck {
	Metadata?: PlexMediaDetails;
}

export interface PlexMediaDetails {
	ratingKey: string;
	key?: string;
	parentRatingKey?: string;
	grandparentRatingKey?: string;
	guid?: string;
	studio?: string;
	type?: string;
	title?: string;
	grandparentTitle?: string;
	parentTitle?: string;
	librarySectionTitle?: string;
	librarySectionID?: number;
	librarySectionKey?: string;
	contentRating?: string;
	summary?: string;
	index?: number;
	audienceRating?: number;
	year?: number;
	tagline?: string;
	thumb?: string;
	art?: string;
	duration?: number;
	originallyAvailableAt?: string;
	leafCount?: number;
	viewedLeafCount?: number;
	childCount?: number;
	addedAt?: number;
	updatedAt?: number;
	audienceRatingImage?: string;
	primaryExtraKey?: string;
	Genre?: Array<PlexTag>;
	Country?: Array<PlexTag>;
	Guid?: Array<PlexGuidObj>;
	Rating?: Array<PlexRating>;
	Collection?: Array<PlexTag>;
	Role?: Array<PlexTag>;
	Label?: Array<PlexTag>;
	Field?: Array<PlexField>;
	Location?: Array<PlexLocation>;
	Preferences?: PlexPreferences;
	Media?: Array<PlexMedia>;
	OnDeck?: PlexOnDeck;
	Extras?: PlexExtras;
}

/**
 * This is the top-level PlexAPI singleton object.
 */
const PlexAPI = {
	/**
	 * @property {string} MachineId - The unique ID for the current Plex Media Server instance.
	 */
	MachineId: "",
	/**
	 * @property {Array<Dictionary>} Labels - Cached list of all tags for a given section in Plex. Make sure to reset when changing sections.
	 */
	Labels: undefined,
	/**
	 * This API command is used to get the capabilities of the Plex Media server.
	 *
	 * @remarks
	 * The capabilities returned include such items as the settings of the Plex server, the operating system, and the version of Plex that is installed.
	 *
	 * @return {Promise<Dictionary>} Object containing details about the Plex server, including the Plex server MachineID.
	 */
	getCapabilities: async function (): Promise<Dictionary> {
		this.debug("PlexAPI.getCapabilities");
		const data = await this.callApi({ url: "/" });
		this.debug(data);
		return data;
	},
	/**
	 * This method returns the Machine ID for the current Plex Media Server instance.
	 *
	 * @remarks
	 * If we haven't gotten the ID yet, it makes an API call to get it before returning.
	 *
	 * @return {Promise<string>} Promise resolving to the string Machine ID.
	 */
	getMachineId: async function (): Promise<string> {
		this.debug("PlexAPI.getMachineId");
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
	 * Plex goes between using the string codes and number codes, need to get one from the other.
	 *
	 * @remarks
	 * Plex seems to use the strings in returned data, but the number codes for commands.
	 *
	 * @param {string} typeString - The string version of the Plex item type. Current supported values: show, movie, collection. I found these using browser dev console, haven't found the others.
	 *
	 * @return {number} The corresponding number code for the given Plex item type string. Codes contained in PlexTypes ENUM.
	 */
	getPlexTypeCode: function (typeString: string): number {
		this.debug("PlexAPI.getPlexTypeCode");
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
	/**
	 * Retrieve the information about all libraries AKA sections that are available on a Plex server using this API command.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all the library sections on the Plex server, from a nested portion of the HTTP response data object.
	 */
	getSections: async function (): Promise<Array<Dictionary>> {
		this.debug("PlexAPI.getSections");
		const data = await this.callApi({ url: "/library/sections" });
		const sections =
			data && data.MediaContainer && data.MediaContainer.Directory
				? data.MediaContainer.Directory
				: [];
		this.debug(sections);
		return sections;
	},
	/**
	 * This API command returns a list of all the collections in a given Plex library section.
	 *
	 * @param {number} sectionId - The numeric ID of the Plex library section we working in.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all the collections from the given library section, from a nested portion of the HTTP response data object.
	 */
	getCollections: async function (
		sectionId: number
	): Promise<Array<Dictionary>> {
		this.debug("PlexAPI.getCollections");
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
	/**
	 * Create a smart collection based on a query of metadata fields.
	 *
	 * @remarks
	 * This may result in up to 3 API calls if: 1) We haven't yet initialized the MachineID, and 2) We need to also set the titleSort field.
	 * Browser Inspector on Plex is your friend for building these queries. Advanced Filter >> Save As Collection
	 *
	 * @todo Refactor Collection Creation call.
	 *
	 * @param {PlexCollectionOptions} options - Options for how to create the collection. See type definition.
	 *
	 * @return {Promise<Dictionary>} Details of the newly created smart collection.
	 */
	createSmartCollection: async function (
		options: PlexCollectionOptions
	): Promise<Dictionary> {
		this.debug("PlexAPI.createSmartCollection");
		const machineId = await PlexAPI.getMachineId();
		options.sort = options.sort ? options.sort : "titleSort";
		options.smart = 1; //Force smart collections only for this method

		// TODO This call needs to be refactored to be cleaner.
		// Looks like you can't set titleSort in this command
		const data = await this.callApi({
			url: `/library/collections?type=${
				options.itemType
			}&title=${encodeURIComponent(options.title)}&smart=${
				options.smart
			}&uri=server%3A%2F%2F${machineId}%2Fcom.plexapp.plugins.library%2Flibrary%2Fsections%2F${
				options.sectionId
			}%2Fall%3Ftype%3D${options.itemType}%26sort%3D${
				options.sort
			}%26${encodeURIComponent(options.query)}&sectionId=${
				options.sectionId
			}`,
			method: "post"
		});

		// Need to do a second call to set titleSort, if we want to.
		if (options.titleSort && options.titleSort != options.title) {
			// Get the ID of the newly created collection from the response of previous request.
			const collectionKey = data?.MediaContainer?.Metadata?.length
				? data.MediaContainer.Metadata[0].ratingKey
				: undefined;

			// If key can't be found, get out of here cause next call might make wrong changes.
			if (!collectionKey) return undefined;

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

		this.debug(data?.MediaContainer?.Metadata[0]);
		return data?.MediaContainer?.Metadata[0];
	},
	/**
	 * This API command returns the information for each account setup on the Plex server.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all the user account objects on the Plex server, from a nested portion of the HTTP response data object.
	 */
	getAccounts: async function (): Promise<Array<Dictionary>> {
		this.debug("PlexAPI.getAccounts");
		const data = await this.callApi({ url: "/accounts" });
		const accounts =
			data && data.MediaContainer && data.MediaContainer.Account
				? data.MediaContainer.Account
				: [];
		this.debug(accounts);
		return accounts;
	},
	/**
	 * Information about a single user account can be returned using this API command.
	 *
	 * @param {number} accountId - The numeric ID of the account we're interested in.
	 *
	 * @return {Promise<Dictionary>} The account object corresponding to the provided account ID, from a nested portion of the HTTP response data object.
	 */
	getSingleAccount: async function (accountId: number): Promise<Dictionary> {
		this.debug("PlexAPI.getSingleAccount");
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
	/**
	 * Get a list of all the labels for this library section, along with label keys.
	 *
	 * @param {number} sectionId - The numeric ID of the Plex library section we working in.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all existing labels and their keys in a given Plex library section, from a nested portion of the HTTP response data object.
	 */
	getLabels: async function (sectionId: number): Promise<Array<Dictionary>> {
		this.debug("PlexAPI.getLabels");
		const data = await this.callApi({
			url: `/library/sections/${sectionId}/label`
		});
		// this.debug(data);
		this.Labels =
			data &&
			data.MediaContainer &&
			data.MediaContainer.Directory &&
			data.MediaContainer.Directory.length
				? data.MediaContainer.Directory
				: [];
		this.debug(this.Labels);
		return this.Labels;
	},
	/**
	 * Get the numeric key for a given label in a given library section.
	 *
	 * @remarks
	 * The label must already exist in the library section, if not use addLabelToItem first.
	 *
	 * @param {number} sectionId - The numeric ID of the Plex library section we working in.
	 * @param {string} label - The tag or label we want to find the numeric key for.
	 *
	 * @return {Promise<number>} The numeric key of the label string we're looking for.
	 */
	getKeyForLabel: async function (
		sectionId: number,
		label: string
	): Promise<number> {
		this.debug("PlexAPI.getKeyForLabel");
		label = label.toLowerCase();
		if (!this.Labels) {
			await this.getLabels(sectionId);
		}
		let labelKey: number;

		// Find the specific label in the array and return the corresponding key, otherwise return undefined.
		if (label && this.Labels && !_.isEmpty(this.Labels)) {
			const labelObj = _.find(this.Labels, { title: label });
			labelKey = labelObj && labelObj.key ? labelObj.key : undefined;
		}
		this.debug(labelKey);
		return labelKey;
	},
	/**
	 * Helper function to simplify adding labels to plex items (Movies, Shows, Collections, etc.).
	 *
	 * @param {number} sectionId - The numeric ID of the Plex library section we working in.
	 * @param {number} itemType - The numeric code of the type of Plex item we're updating (movie, show, collection, etc.). From the ENUM PlexTypes.
	 * @param {number} itemId - The numeric ID of the Plex item we're updating (movie, show, collection, etc.).
	 * @param {string} label - The tag or label we want to add to the Plex item.
	 *
	 * @return {Promise<undefined>} No returned data on Promise resolve.
	 */
	addLabelToItem: async function (
		sectionId: number,
		itemType: number,
		itemId: number,
		label: string
	): Promise<undefined> {
		this.debug("PlexAPI.addLabelToItem");
		label = label.toLowerCase();
		const result = await this.updateItemDetails(sectionId, itemId, {
			"label[0].tag.tag": label,
			"label.locked": 1,
			type: itemType
		});

		// Re-cache labels if this is a new one.
		if (!_.find(this.Labels, { title: label })) {
			await this.getLabels(sectionId);
		}
		return result;
	},
	/**
	 * Helper function to simplify removing labels from Plex items (Movies, Shows, Collections, etc.).
	 *
	 * @param {number} sectionId - The numeric ID of the Plex library section we working in.
	 * @param {number} itemType - The numeric code of the type of Plex item we're updating (movie, show, collection, etc.). From the ENUM PlexTypes.
	 * @param {number} itemId - The numeric ID of the Plex item we're updating (movie, show, collection, etc.).
	 * @param {string} label - The tag or label we want to remove from the Plex item.
	 *
	 * @return {Promise<undefined>} No returned data on Promise resolve.
	 */
	removeLabelFromItem: async function (
		sectionId: number,
		itemType: number,
		itemId: number,
		label: string
	): Promise<undefined> {
		this.debug("PlexAPI.removeLabelFromItem");
		label = label.toLowerCase();
		const result = await this.updateItemDetails(sectionId, itemId, {
			"label[].tag.tag-": label,
			"label.locked": 1,
			type: itemType
		});

		// Re-cache labels if this is a new one.
		if (!_.find(this.Labels, { title: label })) {
			await this.getLabels(sectionId);
		}
		return result;
	},
	/**
	 * Returns an array of all the top-level media items (Movies or TV Shows) in a given Section AKA Library.
	 *
	 * @param {number} itemId - The numeric ID of the Plex media item we want.
	 *
	 * @return {Promise<PlexMediaDetails>} The details of the Plex media item we want.
	 */
	getSingleItem: async function (itemId: number): Promise<PlexMediaDetails> {
		this.debug("PlexAPI.getSingleItem");
		const data = await this.callApi({
			url: `/library/metadata/${itemId}`
		});
		// this.debug(data);
		const item =
			data &&
			data.MediaContainer &&
			data.MediaContainer.Metadata &&
			data.MediaContainer.Metadata.length
				? <PlexMediaDetails>_.first(data.MediaContainer.Metadata)
				: undefined;
		this.debug(item);
		return item;
	},
	/**
	 * Returns an array of all the top-level media items (Movies or TV Shows) in a given Section AKA Library.
	 *
	 * @param {number} sectionId - The numeric ID of the Plex library section we working in.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all the media items in a given Plex library section, from a nested portion of the HTTP response data object.
	 */
	getAllItems: async function (
		sectionId: number
	): Promise<Array<Dictionary>> {
		this.debug("PlexAPI.getAllItems");
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
	/**
	 * This API command updates the metadata for given Plex item in a given library section.
	 *
	 * @todo Type def for updates object.
	 *
	 * @param {number} sectionId - The numeric ID of the Plex library section we working in.
	 * @param {number} itemId - The numeric ID of the Plex item we're updating (movie, show, collection, etc.).
	 * @param {Dictionary} updates - Object containing the fields and values we want to update on the Plex item. (eg {"title": "New Title"})
	 *
	 * @return {Promise<Dictionary>} The data portion of the HTTP response, containing details about the updated Plex Item.
	 */
	updateItemDetails: async function (
		sectionId: number,
		itemId: number,
		updates: Dictionary
	): Promise<Dictionary> {
		this.debug("PlexAPI.updateItemDetails");
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
	/**
	 * Abstracted API calls to Plex, adds URL and API Key automatically.
	 *
	 * @param {AxiosRequestConfig} requestObj - The Axios request config object detailing the desired HTTP request.
	 *
	 * @return {Promise<Dictionary>} The data portion of the response from the Axios HTTP request, or NULL if request failed.
	 */
	callApi: async function (
		requestObj: AxiosRequestConfig
	): Promise<Dictionary> {
		this.debug("PlexAPI.callApi");
		if (!process.env.PLEX_URL || !process.env.PLEX_TOKEN) {
			throw error(
				"Missing .env file containing PLEX_URL and/or PLEX_TOKEN. See README.md"
			);
		}
		try {
			requestObj = requestObj || {};
			requestObj.baseURL = process.env.PLEX_URL;
			requestObj.method = requestObj.method || "get";
			requestObj.params = requestObj.params || {};
			requestObj.params["X-Plex-Token"] = process.env.PLEX_TOKEN;

			// Ignore SSL verification errors, if set in .env (not recommended for production).
			if (
				process.env.IGNORE_SSL_ERRORS_PLEX === "1" &&
				_.startsWith(process.env.PLEX_URL.toLowerCase(), "https")
			) {
				requestObj.httpsAgent = new https.Agent({
					rejectUnauthorized: false
				});
			}

			const start = Date.now();

			const response: AxiosResponse = await axios.request(requestObj);

			const end = Date.now();
			this.debugPerformance(
				`Plex Call Time: ${requestObj.url}: ${end - start} ms`
			);

			// this.debug(response);

			return response.data;
		} catch (error) {
			console.error(error);
			return null;
		}
	},
	/**
	 * Debugger helper function. Only prints to console if NODE_ENV in .env file is set to "development".
	 *
	 * @param {unknown} data - Anything you want to print to console.
	 *
	 * @return None.
	 */
	debug: function (data: unknown) {
		if (process.env.NODE_ENV == "development") {
			console.log(data);
		}
	},
	/**
	 * Debugger helper function. Only prints to console if NODE_ENV in .env file is set to "benchmark2".
	 *
	 * @remark
	 * This is for displaying execution time of individual API calls.
	 *
	 * @param {unknown} data - Anything you want to print to console.
	 *
	 * @return None.
	 */
	debugPerformance: function (data: unknown) {
		if (process.env.NODE_ENV == "benchmark2") {
			console.log(data);
		}
	}
};

export default PlexAPI;

/*
create dumb collection
/library/collections
POST
type=1&
title=Test3&
smart=0&
sectionId=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730&
    server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/metadata/32730&

*/

/*
create dumb collection
/library/collections
POST
type=1&
title=Test5&
smart=0&
sectionId=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fmetadata%2F32730%2C32694%2C30503&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/metadata/32730,32694,30503&

*/

/*

create smart collection
/library/collections
POST
type=1&
title=Test4&
smart=1&
sectionId=1&
uri=server%3A%2F%2Fbaaf4cd09f73f07ddc676de067b123704c60cb1f%2Fcom.plexapp.plugins.library%2Flibrary%2Fsections%2F1%2Fall%3Ftype%3D1%26sort%3DtitleSort%26label%3D139932&

uri=server://baaf4cd09f73f07ddc676de067b123704c60cb1f/com.plexapp.plugins.library/library/sections/1/all?type=1&sort=titleSort&label=139932&
*/

/*
create smart collection
/library/collections
POST
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
show.label=137662

*/

/*
update collection
/library/sections/1/all
PUT
type=18&id=38010&includeExternalMedia=1&titleSort.value=%21000_Poop&titleSort.locked=1
*/

/*
delete collection
/library/collections/38023
DELETE
*/

/*
MOVIE
/library/metadata/37906
GET

includeConcerts=1&
includeExtras=1&
includeOnDeck=1&
includePopularLeaves=1&
includePreferences=1&
includeReviews=1&
includeChapters=1&
includeStations=1&
includeExternalMedia=1&
asyncAugmentMetadata=1&
asyncCheckFiles=1&
asyncRefreshAnalysis=1&
asyncRefreshLocalMediaAgent=1&


{
    "MediaContainer": {
        "size": 1,
        "allowSync": true,
        "augmentationKey": "/library/metadata/augmentations/68",
        "identifier": "com.plexapp.plugins.library",
        "librarySectionID": 1,
        "librarySectionTitle": "Movies",
        "librarySectionUUID": "c6454fa1-f444-452c-a72d-673a2458876e",
        "mediaTagPrefix": "/system/bundle/media/flags/",
        "mediaTagVersion": 1684415019,
        "Metadata": [
            {
                "ratingKey": "37906",
                "key": "/library/metadata/37906",
                "guid": "plex://movie/5f40c12886422500429bb3e7",
                "studio": "STX Entertainment",
                "type": "movie",
                "title": "The Covenant",
                "titleSort": "Covenant",
                "librarySectionTitle": "Movies",
                "librarySectionID": 1,
                "librarySectionKey": "/library/sections/1",
                "contentRating": "R",
                "summary": "Guy Ritchie's The Covenant follows US Army Sergeant John Kinley (Jake Gyllenhaal) and Afghan interpreter Ahmed (Dar Salim). After an ambush, Ahmed goes to Herculean lengths to save Kinley's life. When Kinley learns that Ahmed and his family were not given safe passage to America as promised, he must repay his debt by returning to the war zone to retrieve them before the Taliban hunts them down first.",
                "rating": 8.3,
                "audienceRating": 9.8,
                "year": 2023,
                "tagline": "A bond. A pledge. A commitment.",
                "thumb": "/library/metadata/37906/thumb/1683607994",
                "art": "/library/metadata/37906/art/1683607994",
                "duration": 7383328,
                "originallyAvailableAt": "2023-04-19",
                "addedAt": 1683607991,
                "updatedAt": 1683607994,
                "audienceRatingImage": "rottentomatoes://image.rating.upright",
                "primaryExtraKey": "/library/metadata/37907",
                "ratingImage": "rottentomatoes://image.rating.ripe",
                "Media": [
                    {
                        "id": 73890,
                        "duration": 7383328,
                        "bitrate": 7229,
                        "width": 1920,
                        "height": 800,
                        "aspectRatio": 2.35,
                        "audioChannels": 6,
                        "audioCodec": "eac3",
                        "videoCodec": "h264",
                        "videoResolution": "1080",
                        "container": "mkv",
                        "videoFrameRate": "24p",
                        "videoProfile": "high",
                        "title": "Original",
                        "Part": [
                            {
                                "id": 96413,
                                "key": "/library/parts/96413/1683606094/file.mkv",
                                "duration": 7383328,
                                "file": "/Media/Movies/Guy Ritchie's The Covenant (2023) [h264]/Guy Ritchie's The Covenant (2023) [WEBDL-1080p h264 EAC3].mkv",
                                "size": 6673452259,
                                "container": "mkv",
                                "videoProfile": "high",
                                "Stream": [
                                    {
                                        "id": 280047,
                                        "streamType": 1,
                                        "default": true,
                                        "codec": "h264",
                                        "index": 0,
                                        "bitrate": 6589,
                                        "language": "English",
                                        "languageTag": "en",
                                        "languageCode": "eng",
                                        "bitDepth": 8,
                                        "chromaLocation": "left",
                                        "chromaSubsampling": "4:2:0",
                                        "codedHeight": 800,
                                        "codedWidth": 1920,
                                        "colorPrimaries": "bt709",
                                        "colorRange": "tv",
                                        "colorSpace": "bt709",
                                        "colorTrc": "bt709",
                                        "frameRate": 23.976,
                                        "hasScalingMatrix": false,
                                        "height": 800,
                                        "level": 40,
                                        "original": true,
                                        "profile": "high",
                                        "refFrames": 4,
                                        "scanType": "progressive",
                                        "width": 1920,
                                        "displayTitle": "1080p (H.264)",
                                        "extendedDisplayTitle": "1080p (H.264)"
                                    }
                                ]
                            }
                        ]
                    }
                ],
                "Genre": [
                    {
                        "id": 4,
                        "filter": "genre=4",
                        "tag": "Action"
                    }
                ],
                "Country": [
                    {
                        "id": 371,
                        "filter": "country=371",
                        "tag": "United Kingdom"
                    }
                ],
                "Guid": [
                    {
                        "id": "imdb://tt4873118"
                    },
                    {
                        "id": "tmdb://882569"
                    },
                    {
                        "id": "tvdb://343900"
                    }
                ],
                "Rating": [
                    {
                        "image": "imdb://image.rating",
                        "value": 8,
                        "type": "audience"
                    }
                ],
                "Collection": [
                    {
                        "id": 137665,
                        "filter": "collection=137665",
                        "tag": "Plex Popular"
                    }
                ],
                "Director": [
                    {
                        "id": 15828,
                        "filter": "director=15828",
                        "tag": "Guy Ritchie",
                        "tagKey": "5d776826e6d55c002040af52",
                        "thumb": "https://metadata-static.plex.tv/1/people/1368956f253ba87ded9ed9371ac8522c.jpg"
                    }
                ],
                "Writer": [
                    {
                        "id": 15829,
                        "filter": "writer=15829",
                        "tag": "Guy Ritchie",
                        "tagKey": "5d776826e6d55c002040af52",
                        "thumb": "https://metadata-static.plex.tv/1/people/1368956f253ba87ded9ed9371ac8522c.jpg"
                    }
                ],
                "Role": [
                    {
                        "id": 6954,
                        "filter": "actor=6954",
                        "tag": "Jake Gyllenhaal",
                        "tagKey": "5d776825103a2d001f563c05",
                        "role": "Sgt. John Kinley",
                        "thumb": "https://metadata-static.plex.tv/2/people/2c5a6f78bffd95694fc0f7d9fefc6137.jpg"
                    }
                ],
                "Producer": [
                    {
                        "id": 26579,
                        "filter": "producer=26579",
                        "tag": "Guy Ritchie",
                        "tagKey": "5d776826e6d55c002040af52",
                        "thumb": "https://metadata-static.plex.tv/1/people/1368956f253ba87ded9ed9371ac8522c.jpg"
                    }
                ],
                "Review": [
                    {
                        "id": 267,
                        "filter": "art=267",
                        "tag": "Adam Graham",
                        "text": "An oftentimes riveting war film which marks a new path for the 54-year-old filmmaker.",
                        "image": "rottentomatoes://image.review.fresh",
                        "link": "https://www.detroitnews.com/story/entertainment/movies/2023/04/19/review-guy-ritchies-the-covenant-a-gritty-hard-fought-war-film/70131648007/",
                        "source": "Detroit News"
                    }
                ],
                "Preferences": {
                    "Setting": [
                        {
                            "id": "languageOverride",
                            "label": "Metadata language",
                            "summary": "Language to use for item metadata such as synopsis and title.",
                            "type": "text",
                            "default": "",
                            "value": "",
                            "hidden": false,
                            "advanced": false,
                            "group": "",
                            "enumValues": ":Library default|ar-SA:Arabic (Saudi Arabia)|bg-BG:Bulgarian|ca-ES:Catalan|zh-CN:Chinese|zh-HK:Chinese (Hong Kong)|zh-TW:Chinese (Taiwan)|hr-HR:Croatian|cs-CZ:Czech|da-DK:Danish|nl-NL:Dutch|en-US:English|en-AU:English (Australia)|en-CA:English (Canada)|en-GB:English (UK)|et-EE:Estonian|fi-FI:Finnish|fr-FR:French|fr-CA:French (Canada)|de-DE:German|el-GR:Greek|he-IL:Hebrew|hi-IN:Hindi|hu-HU:Hungarian|id-ID:Indonesian|it-IT:Italian|ja-JP:Japanese|ko-KR:Korean|lv-LV:Latvian|lt-LT:Lithuanian|nb-NO:Norwegian Bokmål|fa-IR:Persian|pl-PL:Polish|pt-BR:Portuguese|pt-PT:Portuguese (Portugal)|ro-RO:Romanian|ru-RU:Russian|sk-SK:Slovak|es-ES:Spanish|es-MX:Spanish (Mexico)|sv-SE:Swedish|th-TH:Thai|tr-TR:Turkish|uk-UA:Ukrainian|vi-VN:Vietnamese"
                        }
                    ]
                },
                "Extras": {
                    "size": 9,
                    "Metadata": [
                        {
                            "ratingKey": "37907",
                            "key": "/library/metadata/37907",
                            "guid": "iva://api.internetvideoarchive.com/2.0/DataService/VideoAssets(395544)",
                            "type": "clip",
                            "title": "Guy Ritchie's The Covenant",
                            "summary": "",
                            "index": 1,
                            "thumb": "/library/metadata/37907/thumb/1683607993",
                            "primaryGuid": "plex://movie/5f40c12886422500429bb3e7",
                            "subtype": "trailer",
                            "duration": 155000,
                            "addedAt": 1683607993,
                            "extraType": 1,
                            "Media": [
                                {
                                    "id": 73891,
                                    "duration": 155000,
                                    "bitrate": 5000,
                                    "width": 1920,
                                    "height": 1080,
                                    "aspectRatio": 1.78,
                                    "audioCodec": "aac",
                                    "videoCodec": "h264",
                                    "videoResolution": "1080",
                                    "container": "mp4",
                                    "optimizedForStreaming": 1,
                                    "protocol": "mp4",
                                    "premium": true,
                                    "Part": [
                                        {
                                            "id": 95779,
                                            "duration": 155000,
                                            "container": "mp4",
                                            "key": "/services/iva/assets/395544/video.mp4?fmt=4&bitrate=5000",
                                            "Stream": [
                                                {
                                                    "id": 278163,
                                                    "streamType": 2,
                                                    "selected": true,
                                                    "codec": "aac",
                                                    "index": 1,
                                                    "channels": 2,
                                                    "language": "English",
                                                    "languageTag": "en",
                                                    "languageCode": "eng",
                                                    "displayTitle": "English (AAC Stereo)",
                                                    "extendedDisplayTitle": "English (AAC Stereo)"
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    }
}
*/

/*
TV SHOW

/library/metadata/38970
GET
includeConcerts=1&includeExtras=1&includeOnDeck=1&includePopularLeaves=1&includePreferences=1&includeReviews=1&includeChapters=1&includeStations=1&includeExternalMedia=1&asyncAugmentMetadata=1&asyncCheckFiles=1&asyncRefreshAnalysis=1&asyncRefreshLocalMediaAgent=1&
{
    "MediaContainer": {
        "size": 1,
        "allowSync": true,
        "augmentationKey": "/library/metadata/augmentations/71",
        "identifier": "com.plexapp.plugins.library",
        "librarySectionID": 2,
        "librarySectionTitle": "TV Shows",
        "librarySectionUUID": "0c4c327e-9602-44d9-a289-8017106e5f23",
        "mediaTagPrefix": "/system/bundle/media/flags/",
        "mediaTagVersion": 1684415019,
        "Metadata": [
            {
                "ratingKey": "38970",
                "key": "/library/metadata/38970/children",
                "guid": "plex://show/63757550e94bac336ff65b16",
                "studio": "Skydance Television",
                "type": "show",
                "title": "FUBAR",
                "librarySectionTitle": "TV Shows",
                "librarySectionID": 2,
                "librarySectionKey": "/library/sections/2",
                "contentRating": "TV-MA",
                "summary": "A father and daughter have both been working as CIA Operatives for years, but each kept their involvement in the CIA hidden from the other, resulting in their entire relationship being a gigantic lie. Upon learning of each other's involvement in the CIA, the pair are forced to work together as partners, and against the backdrop of explosive action, and espionage, learn who each other really are.",
                "index": 1,
                "audienceRating": 7.4,
                "year": 2023,
                "tagline": "Heroes Don't Retire. They Reload.",
                "thumb": "/library/metadata/38970/thumb/1685153013",
                "art": "/library/metadata/38970/art/1685153013",
                "duration": 3180000,
                "originallyAvailableAt": "2023-05-25",
                "leafCount": 8,
                "viewedLeafCount": 0,
                "childCount": 1,
                "addedAt": 1685153009,
                "updatedAt": 1685153013,
                "audienceRatingImage": "themoviedb://image.rating",
                "primaryExtraKey": "/library/metadata/38974",
                "Genre": [
                    {
                        "id": 4,
                        "filter": "genre=4",
                        "tag": "Action"
                    }
                ],
                "Country": [
                    {
                        "id": 34,
                        "filter": "country=34",
                        "tag": "United States of America"
                    }
                ],
                "Guid": [
                    {
                        "id": "imdb://tt13064902"
                    },
                    {
                        "id": "tmdb://221300"
                    },
                    {
                        "id": "tvdb://427281"
                    }
                ],
                "Rating": [
                    {
                        "image": "imdb://image.rating",
                        "value": 6.7,
                        "type": "audience"
                    }
                ],
                "Collection": [
                    {
                        "id": 137674,
                        "filter": "collection=137674",
                        "tag": "TMDb Trending"
                    }
                ],
                "Role": [
                    {
                        "id": 13,
                        "filter": "actor=13",
                        "tag": "Arnold Schwarzenegger",
                        "tagKey": "5d776824151a60001f24a3be",
                        "role": "Luke Brunner",
                        "thumb": "https://metadata-static.plex.tv/f/people/f123e23f50c3e8b134364023d5f77237.jpg"
                    }
                ],
                "Label": [
                    {
                        "id": 140154,
                        "filter": "label=140154",
                        "tag": "Requester:manybothans"
                    }
                ],
                "Field": [
                    {
                        "locked": true,
                        "name": "label"
                    }
                ],
                "Location": [
                    {
                        "path": "/Media/TV Shows/FUBAR"
                    }
                ],
                "Preferences": {
                    "Setting": [
                        {
                            "id": "episodeSort",
                            "label": "Episode sorting",
                            "summary": "How to sort the episodes for this show.",
                            "type": "text",
                            "default": "-1",
                            "value": "-1",
                            "hidden": false,
                            "advanced": false,
                            "group": "",
                            "enumValues": "-1:Library default|0:Oldest first|1:Newest first"
                        }
                    ]
                },
                "OnDeck": {
                    "Metadata": {
                        "ratingKey": "38972",
                        "key": "/library/metadata/38972",
                        "parentRatingKey": "38971",
                        "grandparentRatingKey": "38970",
                        "guid": "plex://episode/63757550e94bac336ff65b45",
                        "parentGuid": "plex://season/63fdfddfa8e00803a3cad3de",
                        "grandparentGuid": "plex://show/63757550e94bac336ff65b16",
                        "type": "episode",
                        "title": "Take Your Daughter To Work Day",
                        "grandparentKey": "/library/metadata/38970",
                        "parentKey": "/library/metadata/38971",
                        "librarySectionTitle": "TV Shows",
                        "librarySectionID": 2,
                        "librarySectionKey": "/library/sections/2",
                        "grandparentTitle": "FUBAR",
                        "parentTitle": "Season 1",
                        "contentRating": "TV-MA",
                        "summary": "With his retirement from the CIA imminent, Luke prepares for his next adventure, but revelations at home and an urgent matter at work upend his plans.",
                        "index": 1,
                        "parentIndex": 1,
                        "year": 2023,
                        "thumb": "/library/metadata/38972/thumb/1685153015",
                        "art": "/library/metadata/38970/art/1685153013",
                        "parentThumb": "/library/metadata/38971/thumb/1685153014",
                        "grandparentThumb": "/library/metadata/38970/thumb/1685153013",
                        "grandparentArt": "/library/metadata/38970/art/1685153013",
                        "duration": 3323904,
                        "originallyAvailableAt": "2023-05-25",
                        "addedAt": 1685153009,
                        "updatedAt": 1685153015,
                        "Media": [
                            {
                                "id": 75169,
                                "duration": 3323904,
                                "bitrate": 5545,
                                "width": 1920,
                                "height": 1080,
                                "aspectRatio": 1.78,
                                "audioChannels": 6,
                                "audioCodec": "eac3",
                                "videoCodec": "h264",
                                "videoResolution": "1080",
                                "container": "mkv",
                                "videoFrameRate": "24p",
                                "videoProfile": "main",
                                "Part": [
                                    {
                                        "id": 97079,
                                        "key": "/library/parts/97079/1685030530/file.mkv",
                                        "duration": 3323904,
                                        "file": "/Media/TV Shows/FUBAR/Season 01/FUBAR - S01E01 - Take Your Daughter to Work Day (2023-05-25) [WEBDL-1080p x264 EAC3 Atmos].mkv",
                                        "size": 2304082248,
                                        "container": "mkv",
                                        "videoProfile": "main",
                                        "Stream": [
                                            {
                                                "id": 282433,
                                                "streamType": 1,
                                                "default": true,
                                                "codec": "h264",
                                                "index": 0,
                                                "bitrate": 5545,
                                                "bitDepth": 8,
                                                "chromaLocation": "left",
                                                "chromaSubsampling": "4:2:0",
                                                "codedHeight": 1088,
                                                "codedWidth": 1920,
                                                "frameRate": 23.976,
                                                "hasScalingMatrix": false,
                                                "height": 1080,
                                                "level": 40,
                                                "profile": "main",
                                                "refFrames": 3,
                                                "scanType": "progressive",
                                                "width": 1920,
                                                "displayTitle": "1080p (H.264)",
                                                "extendedDisplayTitle": "1080p (H.264)"
                                            }
                                        ]
                                    }
                                ]
                            }
                        ],
                        "Guid": [
                            {
                                "id": "imdb://tt13130216"
                            },
                            {
                                "id": "tmdb://4263108"
                            },
                            {
                                "id": "tvdb://9457880"
                            }
                        ],
                        "Director": [
                            {
                                "id": 34345,
                                "filter": "director=34345",
                                "tag": "Phil Abraham",
                                "tagKey": "5d7770e46afb3d0020624551",
                                "thumb": "https://metadata-static.plex.tv/7/people/78062dd3dee60d12b31a6e1ce6c66cc5.jpg"
                            }
                        ],
                        "Writer": [
                            {
                                "id": 64383,
                                "filter": "writer=64383",
                                "tag": "Nick Santora",
                                "tagKey": "5d77683b4de0ee001fccca01",
                                "thumb": "https://metadata-static.plex.tv/people/5d77683b4de0ee001fccca01.jpg"
                            }
                        ],
                        "Role": [
                            {
                                "id": 19365,
                                "filter": "actor=19365",
                                "tag": "Devon Bostick",
                                "tagKey": "5d77683361141d001fb1525b",
                                "role": "Oscar Brunner",
                                "thumb": "https://metadata-static.plex.tv/a/people/aa1895caf4da78acda406cc51b848b6f.jpg"
                            }
                        ],
                        "Extras": {
                            "size": 0
                        }
                    }
                },
                "Extras": {
                    "size": 2,
                    "Metadata": [
                        {
                            "ratingKey": "38974",
                            "key": "/library/metadata/38974",
                            "guid": "iva://api.internetvideoarchive.com/2.0/DataService/VideoAssets(651242)",
                            "type": "clip",
                            "title": "Fubar",
                            "summary": "",
                            "index": 1,
                            "thumb": "/library/metadata/38974/thumb/1685153010",
                            "primaryGuid": "plex://show/63757550e94bac336ff65b16",
                            "subtype": "trailer",
                            "duration": 149000,
                            "addedAt": 1685153010,
                            "extraType": 1,
                            "Media": [
                                {
                                    "id": 75171,
                                    "duration": 149000,
                                    "bitrate": 5000,
                                    "width": 1920,
                                    "height": 804,
                                    "aspectRatio": 2.35,
                                    "audioCodec": "aac",
                                    "videoCodec": "h264",
                                    "videoResolution": "1080",
                                    "container": "mp4",
                                    "optimizedForStreaming": 1,
                                    "protocol": "mp4",
                                    "premium": true,
                                    "Part": [
                                        {
                                            "id": 97081,
                                            "duration": 149000,
                                            "container": "mp4",
                                            "key": "/services/iva/assets/651242/video.mp4?fmt=4&bitrate=5000",
                                            "Stream": [
                                                {
                                                    "id": 282514,
                                                    "streamType": 2,
                                                    "selected": true,
                                                    "codec": "aac",
                                                    "index": 1,
                                                    "channels": 2,
                                                    "language": "English",
                                                    "languageTag": "en",
                                                    "languageCode": "eng",
                                                    "displayTitle": "English (AAC Stereo)",
                                                    "extendedDisplayTitle": "English (AAC Stereo)"
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    }
}
*/
