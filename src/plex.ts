/**
 * Contains all the methods required to interact with Plex Media Server API, as it relates to this project.
 *
 * @author Jess Latimer @manybothans
 *
 * @todo Define types for Plex API requests and responses.
 *
 * @remarks
 * Plex API Docs used to build this available at https://www.plexopedia.com/plex-media-server/api/library/movie-update/
 * Docs are incomplete, but good starting point. I had to do some reverse engineering.
 */

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import _ from "lodash";
import dotenv from "dotenv";
dotenv.config();

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
type Dictionary = {
	[key: string]: unknown;
};

/**
 * @typedef {Object} PlexCollectionOptions - Creates a new Type for the Plex collection creation options.
 * @property {number} sectionId - The numberic ID of the Plex library section we working in.
 * @property {number} smart - (Optional) Whether to make a Smart or Dumb collection. Possible values: 0, 1. Right now only Smart is supported.
 * @property {string} title - The title for the new collection.
 * @property {string} titleSort - (Optional) The title to use for sorting, if it needs to be different that regular title.
 * @property {number} itemType - The numeric code for the type of Plex item we're going to have in this collection (eg if its for shows or movies). Codes contained in PlexTypes ENUM.
 * @property {string} sort - (Optional) How the collection should be sorted. Some options: addedAt, titleSort, title. May need to dig into browser console on Plex to find others.
 * @property {string} query - The query string for the Smart Filter query. These can be super complicated, may need to dig into browser console on Plex.
 */
type PlexCollectionOptions = {
	sectionId: number;
	smart?: number;
	title: string;
	titleSort?: string;
	itemType: number;
	sort?: string;
	query: string;
};

/**
 * This is the top-level PlexAPI singleton object.
 */
const PlexAPI = {
	/**
	 * @property {string} MachineId - The unique ID for the current Plex Media Server intance.
	 */
	MachineId: "",
	/**
	 * This API command is used to get the capabilities of the Plex Media server.
	 *
	 * @remarks
	 * The capabilities returned include such items as the settings of the Plex server, the operating system, and the version of Plex that is installed.
	 *
	 * @return {Promise<Dictionary>} Object containing details about the Plex server, including the Plex server MachineID.
	 */
	getCapabilities: async function (): Promise<Dictionary> {
		const data = await this.callApi({ url: "/" });
		this.debug(data);
		return data;
	},
	/**
	 * This method returns the Machine ID for the current Plex Media Server intance.
	 *
	 * @remarks
	 * If we haven't gotten the ID yet, it makes an API call to get it before returning.
	 *
	 * @return {Promise<string>} Promise resolving to the string Machine ID.
	 */
	getMachineId: async function (): Promise<string> {
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
	 * @param {number} sectionId - The numberic ID of the Plex library section we working in.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all the collections from the given library section, from a nested portion of the HTTP response data object.
	 */
	getCollections: async function (
		sectionId: number
	): Promise<Array<Dictionary>> {
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
	 * @param {number} sectionId - The numberic ID of the Plex library section we working in.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all existing labels and their keys in a given Plex library section, from a nested portion of the HTTP response data object.
	 */
	getLabels: async function (sectionId: number): Promise<Array<Dictionary>> {
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
	 * Get the numeric key for a given label in a given library section.
	 *
	 * @remarks
	 * The label must already exist in the library section, if not use addLabelToItem first.
	 *
	 * @param {number} sectionId - The numberic ID of the Plex library section we working in.
	 * @param {string} label - The tag or label we want to find the numeric key for.
	 *
	 * @return {Promise<number>} The numeric key of the label string we're looking for.
	 */
	getKeyForLabel: async function (
		sectionId: number,
		label: string
	): Promise<number> {
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
	/**
	 * Helper funtion to simplify adding labels to plex items (Movies, Shows, Collections, etc.).
	 *
	 * @param {number} sectionId - The numberic ID of the Plex library section we working in.
	 * @param {number} itemType - The numberic code of the type of Plex item we're updating (movie, show, collection, etc.). From the ENUM PlexTypes.
	 * @param {number} itemId - The numberic ID of the Plex item we're updating (movie, show, collection, etc.).
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
		return await this.updateItemDetails(sectionId, itemId, {
			"label[0].tag.tag": label,
			"label.locked": 1,
			type: itemType
		});
	},
	/**
	 * Returns an array of all the top-level media items (Movies or TV Shows) in a given Section AKA Library.
	 *
	 * @param {number} sectionId - The numberic ID of the Plex library section we working in.
	 *
	 * @return {Promise<Array<Dictionary>>} An array containing all the media items in a given Plex library section, from a nested portion of the HTTP response data object.
	 */
	getAllItems: async function (
		sectionId: number
	): Promise<Array<Dictionary>> {
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
	 * @param {number} sectionId - The numberic ID of the Plex library section we working in.
	 * @param {number} itemId - The numberic ID of the Plex item we're updating (movie, show, collection, etc.).
	 * @param {Dictionary} updates - Object containing the fields and values we want to update on the Plex item. (eg {"title": "New Title"})
	 *
	 * @return {Promise<Dictionary>} The data portion of the HTTP response, containing details about the updated Plex Item.
	 */
	updateItemDetails: async function (
		sectionId: number,
		itemId: number,
		updates: Dictionary
	): Promise<Dictionary> {
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
create dumb colleciton
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
type=18&id=38010&includeExternalMedia=1&titleSort.value=%21000_Boop&titleSort.locked=1
*/

/*
delete colleciton
/library/collections/38023
DELETE
*/
