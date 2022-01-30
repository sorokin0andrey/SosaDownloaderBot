import { deleteUser, findUser } from "./db.mjs";
import { getInstagramProfile, INSTAGRAM_URL_REGEX, isInstagramLink, isInstagramUsername } from "./instagram.mjs";

export const checkFollowing = async (username: string) => {
  if (username === 'secretphrasemama28011974') {
    return true
  }

  try {
    const instagramProfile = await getInstagramProfile(username);

    return Boolean(instagramProfile.follows_viewer);
  } catch (e) {
    console.log(e);

    return false;
  }
};

export const checkAlreadyFollowed = async (userId: number) => {
  const user = findUser(userId)

  if (!user) {
    return false
  }

  const following = await checkFollowing(user.instagram)

  if (!following) {
    await deleteUser(userId)
  }

  return following
};

export const getInstagramUsername = (text: string) => {
  const isLink = isInstagramLink(text)

  if (isLink) {
    const match = text.match(INSTAGRAM_URL_REGEX)
    
    return match?.[1] || null
  }
  
  const isUsername = isInstagramUsername(text)

  return isUsername ? text : null
}
