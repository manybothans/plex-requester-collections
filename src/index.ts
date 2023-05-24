import dotenv from "dotenv";
dotenv.config();

import PlexAPI from "./plex";
import OverseerrAPI from "./overseerr";
import TautulliAPI, { TautulliHistoryDetails } from "./tautulli";
import RadarrAPI from "./radarr";
import SonarrAPI from "./sonarr";
import _ from "lodash";
import moment from "moment";

const app = async function () {
	// Feature flag to turn off tagging media with requester and creating corresponding smart collections. For development. Default on.
	if (process.env.FEATURE_REQUESTER_COLLECTIONS !== "0") {
		// Get all the requests from Overseerr.
		const requests = await OverseerrAPI.getAllRequests();

		// Get the Plex library sections. It's not easy to get the section ID for a given media item,
		// so it's easier to start with the sections and work down.
		const plexSections = await PlexAPI.getSections();

		// Is the optional list of library sections to include set?
		const includeSections: Array<string> = process.env.PLEX_INCLUDE_SECTIONS
			? process.env.PLEX_INCLUDE_SECTIONS.split(",")
			: undefined;

		for (let i = 0; i < plexSections.length; i++) {
			// ID of current library section.
			const sectionId = parseInt(<string>plexSections[i]?.key);

			// Only do included sections if include list is set in .env
			if (
				!includeSections ||
				(includeSections.length &&
					includeSections.indexOf(sectionId.toString()) >= 0)
			) {
				console.log("-----------------------------------------------");
				console.log(`Starting Section: ${plexSections[i]?.title}`);
				console.log("-----------------------------------------------");

				// Media type of current section (e.g. TV vs Movie)
				const sectionType = <string>plexSections[i]?.type;

				// We only support Movies and TV Shows for now.
				if (sectionType == "movie" || sectionType == "show") {
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
							const mediaId = parseInt(
								<string>mediaItem.ratingKey
							);
							const plexUsername =
								request?.requestedBy?.plexUsername;

							// Print to console.
							console.log(
								`${mediaItem.title} requested by ${plexUsername}`
							);

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
								const mediaLabelKey =
									await PlexAPI.getKeyForLabel(
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
											PlexAPI.getPlexTypeCode(
												sectionType
											),
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
										parseInt(
											<string>createColResult.ratingKey
										),
										"owner:" + plexUsername
									);
								}

								// Update list of collections we're working with now that we've added one.
								collections = await PlexAPI.getCollections(
									sectionId
								);

								// Print to console.
								console.log("     -> Smart Collection created");
							}

							// Now let's start looking at watch history and Radarr/Sonarr.
							// Only continue if we have the right creds.
							if (
								process.env.TAUTULLI_URL &&
								process.env.TAUTULLI_API_KEY
							) {
								// Handle Radarr items.
								if (
									sectionType == "movie" &&
									process.env.RADARR_URL &&
									process.env.RADARR_API_KEY
								) {
									// Get the Radarr item from the TMDB ID, so we can use the Radarr ID.
									const radarrItem =
										await RadarrAPI.getMediaItemForTMDBId(
											request?.media?.tmdbId
										);

									// Does the item exist in Radarr?
									if (radarrItem) {
										// Tag the item with the requester username.
										await RadarrAPI.addTagToMediaItem(
											radarrItem.id,
											mediaLabelValue
										);

										// Get all sessions that this requester user has viewed this media item.
										const watchHistories =
											await TautulliAPI.getHistory({
												user: plexUsername,
												rating_key: mediaId
											});

										// Filter history sessions to find if the media item was fully watched.
										const watchedSession = _.find(
											watchHistories,
											(session: TautulliHistoryDetails) =>
												session?.watched_status === 1
										);

										// We have evidence that the requester has fully watched the media item.
										if (watchedSession) {
											// Add the tag to the media item in Radarr indicating that the requester has watched the item.
											await RadarrAPI.addTagToMediaItem(
												radarrItem.id,
												"requester_watched"
											);

											// Print to console.
											console.log(
												"     -> Watched by requester"
											);
										}
										// If they haven't finished watching it, is it a stale request?
										else {
											const lastWatchedDate =
												watchHistories &&
												watchHistories.length
													? watchHistories[0].date
													: 0;

											// If the media item was downloaded more than 6 months ago, and the requester hasn't watched in the last 3 months, tag it as stale.
											if (
												moment(
													request.media?.mediaAddedAt
												) <
													moment().subtract(
														6,
														"months"
													) &&
												moment(lastWatchedDate) <
													moment().subtract(
														3,
														"months"
													)
											) {
												await RadarrAPI.addTagToMediaItem(
													radarrItem.id,
													"stale_request"
												);

												// Print to console.
												console.log(
													"     -> Stale request"
												);
											}
										}
									}
								}
								// Handle Sonarr items.
								if (
									sectionType == "show" &&
									process.env.SONARR_URL &&
									process.env.SONARR_API_KEY
								) {
									// Find the media item in Sonarr.
									const sonarrItem =
										await SonarrAPI.getMediaItemForTVDBId(
											request?.media?.tvdbId
										);

									if (sonarrItem) {
										// Tag the item with the requester username.
										await SonarrAPI.addTagToMediaItem(
											sonarrItem.id,
											mediaLabelValue
										);

										// Get all sessions that this requester user has viewed this media item.
										const watchHistories =
											await TautulliAPI.getHistory({
												user: plexUsername,
												grandparent_rating_key: mediaId
											});

										// Filter the history sessions by "fully watched"
										const filteredHistories = _.filter(
											watchHistories,
											{ watched_status: 1 }
										);

										// Make a list of unique episodes that have been fully watched.
										const uniqueEpisodeHistories = _.uniqBy(
											filteredHistories,
											"rating_key"
										);

										// Has the user watched all the epsiodes, and have all the current episodes been downloaded?
										if (
											uniqueEpisodeHistories?.length ===
												sonarrItem?.statistics
													?.episodeCount &&
											sonarrItem?.statistics
												?.percentOfEpisodes === 100
										) {
											// Tag the media item.
											await SonarrAPI.addTagToMediaItem(
												sonarrItem.id,
												"requester_watched"
											);

											// Print to console.
											console.log(
												"     -> Watched by requester"
											);
										}
										// If they haven't finished watching it, is it a stale request?
										else {
											const lastWatchedDate =
												watchHistories &&
												watchHistories.length
													? watchHistories[0].date
													: 0;

											// If the media item was downloaded more than 6 months ago, and the requester hasn't watched in the last 3 months, tag it as stale.
											if (
												moment(
													request.media?.mediaAddedAt
												) <
													moment().subtract(
														6,
														"months"
													) &&
												moment(lastWatchedDate) <
													moment().subtract(
														3,
														"months"
													)
											) {
												await SonarrAPI.addTagToMediaItem(
													sonarrItem.id,
													"stale_request"
												);

												// Print to console.
												console.log(
													"     -> Stale request"
												);
											}
										}
									}
								}
							}
						}
					}
				} else {
					console.log("Unsupported Media Type: " + sectionType);
				}

				console.log("Done Section.");
			}
		}
	}

	console.log("Done, Done, Done.");
};

// Run every 24 h.
setInterval(app, 86400000);
app();
