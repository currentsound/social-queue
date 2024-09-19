"use server";
import { Logger } from "next-axiom";
import { errorString } from "@/utils/logging";
import { buildGraphAPIURL, FacebookGraphError } from "@/utils/facebookSdk";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchAccessTokenForInstagramBusinessAccountId } from "./socialMediaPosts";

export const saveInstagramAccount = async ({
  appScopedUserId,
  shortLivedAccessToken,
  instagramBusinessAccountId,
  facebookPageId,
  instagramAccountName,
  pictureUrl,
  userId,
}: {
  appScopedUserId: string;
  shortLivedAccessToken: string;
  instagramBusinessAccountId: string;
  facebookPageId: string;
  instagramAccountName: string;
  pictureUrl: string;
  userId: string;
}) => {
  let logger = new Logger().with({
    appScopedUserId,
    shortLivedAccessToken,
    instagramBusinessAccountId,
    facebookPageId,
    instagramAccountName,
    pictureUrl,
    userId,
  });
  try {
    const { instagramUsername } = await fetchInstagramUsernameFromPageId({
      instagramBusinessAccountId,
      shortLivedAccessToken,
    });
    logger = logger.with({ instagramUsername });
    const { longLivedAccessToken } = await fetchLongLivedAccessToken(
      shortLivedAccessToken
    );
    logger = logger.with({ longLivedAccessToken });
    const profilePictureFilePath = await uploadInstagramProfilePicture({
      userId,
      instagramBusinessAccountId,
      pictureUrl,
    });
    const supabase = createClient();
    const { error } = await supabase.from("instagram-accounts").insert({
      account_name: instagramAccountName,
      facebook_page_id: facebookPageId,
      instagram_business_account_id: instagramBusinessAccountId,
      access_token: longLivedAccessToken,
      picture_file_path: profilePictureFilePath,
      user_id: userId,
    });
    if (error) {
      logger.error(errorString, error);
      await logger.flush();
      return {
        error:
          "Sorry, we ran into an error connecting your Instagram account. Please try again.",
      };
    }
  } catch (error) {
    await logger.flush();
    logger.error(errorString, {
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
    return {
      error:
        "Sorry, we ran into an error connecting your Instagram account. Please try again.",
    };
  } finally {
    await logger.flush();
  }

  revalidatePath("/accounts");
  return {
    data: {
      message: "Successfully added Instagram account",
      instagramBusinessAccountId,
    },
    error: null,
  };
};

export const deleteInstagramAccount = async (
  prevState: any,
  data: FormData
) => {
  const instagramBusinessAccountId = data.get(
    "instagramBusinessAccountId"
  ) as string;
  const userId = data.get("userId") as string;
  const logger = new Logger().with({
    instagramBusinessAccountId,
    userId,
  });
  const supabase = createClient();
  try {
    const { error } = await supabase
      .from("instagram-accounts")
      .delete()
      .eq("instagram_business_account_id", instagramBusinessAccountId);
    if (error) {
      logger.error(errorString, error);
      await logger.flush();
      return {
        error:
          "Sorry, we ran into an error deleting your Instagram account. Please try again.",
      };
    }

    const { error: storageError } = await supabase.storage
      .from(
        process.env.NEXT_PUBLIC_SOCIAL_MEDIA_POST_MEDIA_FILES_STORAGE_BUCKET!
      )
      .remove([`${userId}/instagramAccount/${instagramBusinessAccountId}`]);
    if (storageError) {
      logger.error(errorString, storageError);
      await logger.flush();
      return {
        error:
          "Sorry, we ran into an error deleting your Instagram account. Please try again.",
      };
    }
  } catch (error) {
    await logger.flush();
    logger.error(errorString, {
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
    return {
      error:
        "Sorry, we ran into an error deleting your Instagram account. Please try again.",
    };
  } finally {
    await logger.flush();
  }
  revalidatePath("/accounts");
  return {
    data: "Successfully deleted Instagram account",
    error: null,
  };
};

const uploadInstagramProfilePicture = async ({
  userId,
  instagramBusinessAccountId,
  pictureUrl,
}: {
  userId: string;
  instagramBusinessAccountId: string;
  pictureUrl: string;
}) => {
  const logger = new Logger().with({
    function: "uploadInstagramProfilePicture",
    userId,
    instagramBusinessAccountId,
    pictureUrl,
  });
  const supabase = createClient();

  const bucketName =
    process.env.NEXT_PUBLIC_SOCIAL_MEDIA_POST_MEDIA_FILES_STORAGE_BUCKET;

  if (!bucketName) {
    logger.error(errorString, {
      error: "No bucket name found in environment",
    });
    await logger.flush();
    throw new Error("No bucket name found in environment");
  }

  let file;
  try {
    const response = await fetch(pictureUrl);
    if (!response.ok) {
      throw new Error(`Failed to download picture from URL: ${pictureUrl}`);
    }
    const blob = await response.blob();
    file = new File([blob], `profile_picture`, { type: blob.type });
  } catch (error) {
    logger.error("Failed to download or create file from URL", {
      error: error instanceof Error ? error.message : JSON.stringify(error),
    });
    await logger.flush();
    throw new Error("Failed to download or create file from URL");
  }

  const filePath = `${userId}/instagramAccount/${instagramBusinessAccountId}/profile_picture.${
    file.type.split("/")[1]
  }`;

  // Upload file
  const { data: uploadResponse, error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(filePath, file, { upsert: true });
  if (uploadError) {
    logger.error(errorString, uploadError);
    throw Error(
      "Sorry, we had an issue uploading your file. Please try again."
    );
  }
  if (!uploadResponse?.path) {
    logger.error(errorString, {
      error: "No file path found in response from Supabase",
    });
    throw new Error("No file path found in response from Supabase");
  }
  return uploadResponse.path;
};

const fetchInstagramUsernameFromPageId = async ({
  instagramBusinessAccountId,
  shortLivedAccessToken,
}: {
  instagramBusinessAccountId: string;
  shortLivedAccessToken: string;
}) => {
  const logger = new Logger().with({
    function: "fetchInstagramUsernameFromPageId",
    instagramBusinessAccountId,
    shortLivedAccessToken,
  });
  const fields = "username";
  const response = await fetch(
    `https://graph.facebook.com/v${process.env.FACEBOOK_GRAPH_API_VERSION}/${instagramBusinessAccountId}?
        fields=${fields}&access_token=${shortLivedAccessToken}`
  );
  const data = (await response.json()) as {
    error: FacebookGraphError;
    username: string;
  };
  logger.info("Fetched Instagram account data", data);
  if (data.error) {
    logger.error(errorString, data.error);
    await logger.flush();
    throw new Error("Failed fetching Instagram business account from page id");
  }
  await logger.flush();
  return {
    instagramUsername: data.username,
  };
};

const fetchLongLivedAccessToken = async (shortLivedAccessToken: string) => {
  const logger = new Logger().with({
    function: "fetchLongLivedAccessToken",
    shortLivedAccessToken,
  });
  const response = await fetch(
    `https://graph.facebook.com/v${process.env.FACEBOOK_GRAPH_API_VERSION}/oauth/access_token?
      grant_type=fb_exchange_token&client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&
      client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&
      fb_exchange_token=${shortLivedAccessToken}`,
    {
      method: "GET",
    }
  );
  const data = (await response.json()) as {
    error: FacebookGraphError;
    access_token: string;
  };
  logger.info("Fetched long lived access token", data);
  if (data.error) {
    logger.error(errorString, data.error);
    await logger.flush();
    throw new Error("Failed fetching long lived access token");
  }
  await logger.flush();
  return {
    longLivedAccessToken: data.access_token,
  };
};

export const fetchInstagramPublishingRateLimit = async ({
  instagramBusinessAccountId,
  userId,
}: {
  instagramBusinessAccountId: string;
  userId: string;
}) => {
  const logger = new Logger().with({
    function: "fetchInstagramPublishingRateLimit",
    instagramBusinessAccountId,
    userId,
  });
  const accessToken = await fetchAccessTokenForInstagramBusinessAccountId({
    instagramBusinessAccountId,
    userId,
  });
  const graphUrl = buildGraphAPIURL({
    path: `/${instagramBusinessAccountId}/content_publishing_limit`,
    searchParams: { fields: "config,quota_usage" },
    accessToken,
  });

  const resp = await fetch(graphUrl, {
    method: "GET",
  });

  const { error: facebookGraphError, data } = (await resp.json()) as {
    error: FacebookGraphError;
    data: {
      config: {
        quota_total: number;
      };
      quota_usage: number;
    }[];
  };

  logger.info("Fetched instagram rate limit", {
    ...data,
    ...facebookGraphError,
  });
  if (facebookGraphError) {
    logger.error(errorString, { ...facebookGraphError });
    await logger.flush();
    throw new Error("Failed creating carousel container");
  }
  if (data.length === 0) {
    logger.error(errorString, {
      error: "No data found in response from Facebook Graph API",
    });
    await logger.flush();
    throw new Error("Failed creating carousel container");
  }
  await logger.flush();
  return data[0];
};
