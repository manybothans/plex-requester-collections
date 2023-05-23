import PlexAPI from "./plex";
import OverseerrAPI from "./overseerr";
import TautulliAPI, { TautulliHistoryDetails } from "./tautulli";
import RadarrAPI from "./radarr";
import SonarrAPI from "./sonarr";
import _ from "lodash";

(async function app() {
	// Feature flag for Tautulli integration. For dev. Default off.
	if (process.env.FEATURE_TAUTULLI === "1") {
		// TautulliAPI.arnold();
		TautulliAPI.getHistory({ user: "manybothans" });
	}
	// Feature flag for Radarr integration. For dev. Default off.
	if (process.env.FEATURE_RADARR === "1") {
		RadarrAPI.getHealth();
		// RadarrAPI.getTags();
		// RadarrAPI.createTag("newtag");
		// const movie = await RadarrAPI.getMediaItems(316021);
		// movie.tags.push(1);
		// RadarrAPI.updateMediaItem(128, movie);
		// RadarrAPI.addTagToMediaItem(128, "newtag");
	}
	// Feature flag for Sonarr integration. For dev. Default off.
	if (process.env.FEATURE_SONARR === "1") {
		SonarrAPI.getHealth();
		// const series = await SonarrAPI.getMediaItem(133);
		// console.log(series.seasons);
	}

	// PlexAPI.getAllItems(1);
	// OverseerrAPI.getAllRequests();

	// Feature flag to turn off tagging media with requester and creating corresponding smart collections. For development. Default on.
	if (process.env.FEATURE_REQUESTER_COLLECTIONS !== "0") {
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
			const sectionType = <string>plexSections[i]?.type;

			// We only support Movies and TV Shows for now.
			if (sectionType == "movie" || sectionType == "show") {
				// ID of current library section.
				const sectionId = parseInt(<string>plexSections[i]?.key);

				// Get all the media items and existing collections for this library section.
				const mediaItems = await PlexAPI.getAllItems(sectionId);
				let collections = await PlexAPI.getCollections(sectionId);

				// Cycle through each media item in the library section, tag it with the requester.
				for (let j = 0; j < mediaItems.length; j++) {
					const mediaItem = mediaItems[j];

					// Does a requester entry exist for this media item?
					const request = _.find(
						requests,
						(item) =>
							item?.media?.ratingKey === mediaItem?.ratingKey
					);

					// Bingo, this media item has a requester... Do the stuff.
					if (mediaItem && request) {
						// Init some values we're going to need.
						const mediaId = parseInt(<string>mediaItem.ratingKey);
						const plexUsername = request?.requestedBy?.plexUsername;

						// Tag the media item.
						const mediaLabelValue = "requester:" + plexUsername;
						await PlexAPI.addLabelToItem(
							sectionId,
							PlexAPI.getPlexTypeCode(sectionType),
							mediaId,
							mediaLabelValue
						);

						// This is what the smart collection should be called.
						const collectionTitle =
							sectionType == "movie"
								? "Movies Requested by " + plexUsername
								: "TV Shows Requested by " + plexUsername;

						// Does the smart collection already exist?
						const collection = _.find(
							collections,
							(item) => item?.title === collectionTitle
						);
						// If collection exists with this title, assume it's set up correctly and we don't need to do anything else.
						// If collection does not exist with this title, create it and tag is with owner label.
						if (!collection) {
							// Get the numberic ID of the label we're using right now.
							const mediaLabelKey = await PlexAPI.getKeyForLabel(
								sectionId,
								mediaLabelValue
							);

							// Create the new smart collection
							const createColResult =
								await PlexAPI.createSmartCollection({
									sectionId: sectionId,
									title: collectionTitle,
									titleSort: "zzz_" + collectionTitle, // TO DO Move prefix to env option.
									itemType:
										PlexAPI.getPlexTypeCode(sectionType),
									sort: "addedAt%3Adesc", //date added descending
									query: "label=" + mediaLabelKey
								});
							// Only continue if creating the collection seems to have worked.
							if (createColResult) {
								await PlexAPI.addLabelToItem(
									sectionId,
									PlexAPI.getPlexTypeCode(
										<string>createColResult.type
									),
									parseInt(<string>createColResult.ratingKey),
									"owner:" + plexUsername
								);
							}

							// Update list of collections we're working with now that we've added one.
							collections = await PlexAPI.getCollections(
								sectionId
							);
						}

						// Now let's start looking at watch history and Radarr/Sonarr.
						// Only continue if we have the right creds.
						if (
							process.env.RADARR_URL &&
							process.env.RADARR_API_KEY &&
							process.env.SONARR_URL &&
							process.env.SONARR_API_KEY &&
							process.env.TAUTULLI_URL &&
							process.env.TAUTULLI_API_KEY
						) {
							// Get all sessions that this requester user has viewed this media item.
							const watchHistories = await TautulliAPI.getHistory(
								{
									user: plexUsername,
									rating_key: mediaId
								}
							);
							// console.log(watchHistories);

							// Filter history sessions to find if the media item was fully watched.
							const watchedSession = _.find(
								watchHistories,
								(session: TautulliHistoryDetails) =>
									session?.watched_status === 1
							);
							// console.log(watchedSession);

							// We have evidence that the requester has fully watched the media item.
							if (watchedSession) {
								// Handle Radarr items.
								if (sectionType == "movie") {
									// Get the Radarr ID from the TMDB ID
									const radarrItems =
										await RadarrAPI.getMediaItems(
											request?.media?.tmdbId
										);

									// Add the tag to the media item in Radarr indicating that the requester has watched the item.
									if (radarrItems && _.first(radarrItems)) {
										await RadarrAPI.addTagToMediaItem(
											_.first(radarrItems).id,
											"requester_watched"
										);
										await RadarrAPI.addTagToMediaItem(
											_.first(radarrItems).id,
											"requester:" + plexUsername
										);
									}
								}
								// Handle Sonarr items.
								if (sectionType == "show") {
									//
								}
							}
						}

						// Print to console, we're done this one.
						console.log(
							`${mediaItem.title} requested by ${plexUsername}`
						);
					}
				}
			} else {
				console.log("Unsupported Media Type: " + sectionType);
			}

			console.log("Done Section.");
		}
	}

	console.log("Done, Done, Done.");
})();
