import OverseerrAPI from "./overseerr";
import PlexAPI from "./plex";
import _ from "lodash";

// Wrap in async function in order to use await
(async function app() {
	// Get all the requests from Overseerr.
	const requests = await OverseerrAPI.getAllRequests();

	// Get the Plex library sections. It's not easy to get the section ID for a given media item,
	// so it's easier to start with the sections and work down.
	const plexSections = await PlexAPI.getSections();
	for (let i = 0; i < plexSections.length; i++) {
		console.log("-----------------------------------------------");
		console.log(`Starting Section: ${plexSections[i]?.title}`);
		console.log("-----------------------------------------------");

		// Media type of current section (e.g. TV vs Movie)
		const sectionType = plexSections[i]?.type;

		// We only support Movies and TV Shows for now.
		if (sectionType == "movie" || sectionType == "show") {
			// ID of current library section.
			const sectionId = parseInt(plexSections[i]?.key);

			// Get all the media items, existing collections, and existing labels for this library section.
			const mediaItems = await PlexAPI.getAllItems(sectionId);
			const collections = await PlexAPI.getCollections(sectionId);
			const labels = await PlexAPI.getLabels(sectionId);

			// Cycle through each media item in the library section, tag it with the requester.
			for (let j = 0; j < mediaItems.length; j++) {
				const mediaItem = mediaItems[j];
				const request = getRequestForPlexMediaId(
					requests,
					parseInt(mediaItem?.ratingKey)
				);
				if (mediaItem && request) {
					console.log(
						`${mediaItem.title} requested by ${request?.requestedBy?.displayName}`
					);
				}
			}
		} else {
			console.log("Unsupported Media Type: " + sectionType);
		}
	}
})();

const getRequestForPlexMediaId = function (requests, plexId) {
	const result = _.find(
		requests,
		(element) => parseInt(element?.media?.ratingKey) === plexId
	);
	return result;
};
