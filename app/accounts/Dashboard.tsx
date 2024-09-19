"use client";

import { useEffect, useState } from "react";
import { InstagramAccount } from "@/utils/facebookSdk";
import {
  deleteInstagramAccount,
  saveInstagramAccount,
} from "@/app/actions/instagramAccounts";
import { useFormState } from "react-dom";
import { Button } from "@/components/common/Button";
import Text from "@/components/common/Text";
import toast from "react-hot-toast";
import TikTokLoginButton from "@/app/accounts/TikTokLoginButton";
import ConnectInstagramAccountButton from "@/app/accounts/ConnectInstagramAccountButton";
import ConnectYoutubeAccountButton from "./ConnectYoutubeAccountButton";
import { Tables } from "@/types/supabase";
import Icons from "@/components/common/Icons";
import { deleteYoutubeChannel } from "../actions/youtube";
import { XCircleIcon } from "@heroicons/react/24/solid";
import Modal from "@/components/common/Modal";
import TikTokLoginButton from "@/app/accounts/TikTokLoginButton";

export default function Dashboard({
  userId,
  instagramAccounts,
  youtubeChannels,
}: {
  userId: string;
  instagramAccounts: Tables<"instagram-accounts">[];
  youtubeChannels: Tables<"youtube-channels">[];
}) {
  const [appScopedUserId, setAppScopedUserId] = useState<string>("");
  const [newInstagramAccounts, setNewInstagramAccounts] = useState<
    InstagramAccount[]
  >([]);
  const [state, formAction] = useFormState(saveInstagramAccount, {
    error: null,
    data: { message: "", instagramBusinessAccountId: "" },
  });
  const [deleteInstagramAccountState, deleteInstagramAccountFormAction] =
    useFormState(deleteInstagramAccount, {
      error: null,
      data: "",
    });
  const [deleteYoutubeChannelState, deleteYoutubeChannelFormAction] =
    useFormState(deleteYoutubeChannel, {
      error: null,
      data: "",
    });
  const [openConfirmDeleteModal, setOpenConfirmDeleteModal] = useState(false);
  const [instagramAccountToDelete, setInstagramAccountToDelete] =
    useState<Tables<"instagram-accounts">>();
  const [youtubeChannelToDelete, setYoutubeChannelToDelete] =
    useState<Tables<"youtube-channels">>();

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    } else if (state.data) {
      if (state.data.instagramBusinessAccountId) {
        setNewInstagramAccounts((prevAccounts) =>
          prevAccounts.filter(
            (account) =>
              account.instagram_business_account.id !==
              state.data.instagramBusinessAccountId
          )
        );
      }
    }
  }, [state]);

  useEffect(() => {
    if (deleteInstagramAccountState.error) {
      toast.error(deleteInstagramAccountState.error);
    } else if (deleteInstagramAccountState.data) {
      toast.success(deleteInstagramAccountState.data);
      setOpenConfirmDeleteModal(false);
    }
  }, [deleteInstagramAccountState]);

  useEffect(() => {
    if (deleteYoutubeChannelState.error) {
      toast.error(deleteYoutubeChannelState.error);
    } else if (deleteYoutubeChannelState.data) {
      toast.success(deleteYoutubeChannelState.data);
      setOpenConfirmDeleteModal(false);
    }
  }, [deleteYoutubeChannelState]);

  const constructSocialAccountBlock = (
    instagramAccountToDelete: Tables<"instagram-accounts"> | undefined,
    youtubeChannelToDelete: Tables<"youtube-channels"> | undefined
  ) => {
    if (instagramAccountToDelete) {
      return (
        <div
          className={`p-4 rounded-lg bg-gray-800 flex flex-col items-center gap-2`}
          key={instagramAccountToDelete.instagram_business_account_id}
        >
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <img
                src={instagramAccountToDelete.picture_file_path}
                alt={instagramAccountToDelete.account_name}
                className="w-8 h-8 rounded-full"
              />
              {/* <Icons.instagram className="absolute bottom-[-8px] right-[-8px] w-6 h-6 rounded-full" /> */}
            </div>
            <Text text={instagramAccountToDelete.account_name} />
          </div>
        </div>
      );
    } else if (youtubeChannelToDelete) {
      return (
        <div
          className={`p-4 rounded-lg bg-gray-800 flex flex-col items-center gap-2`}
          key={youtubeChannelToDelete.id}
        >
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8">
              <img
                src={youtubeChannelToDelete.profile_picture_path}
                alt={youtubeChannelToDelete.channel_custom_url}
                className="w-8 h-8 rounded-full"
              />
              <Icons.youtube className="absolute bottom-[-8px] right-[-8px] w-6 h-6 rounded-full" />
            </div>
            <Text text={youtubeChannelToDelete.channel_custom_url} />
          </div>
        </div>
      );
    }
  };

  return (
    <>
      <div className="mt-8">
        <Text intent={"title"} text={"Connect A New Account"} />
        <div className="flex items-center gap-2 mt-4 justify-center">
          <TikTokLoginButton />
          <ConnectYoutubeAccountButton />
          <ConnectInstagramAccountButton
            setAppScopedUserId={setAppScopedUserId}
            setInstagramAccounts={setNewInstagramAccounts}
          />
        </div>
        <div className="flex items-center justify-center flex-wrap gap-2 mt-4">
          {newInstagramAccounts
            .filter(
              (account) =>
                !instagramAccounts.some(
                  (existingAccount) =>
                    existingAccount.instagram_business_account_id ===
                    account.instagram_business_account.id
                )
            )
            .map((account) => (
              <form
                action={formAction}
                className={`p-4 rounded-lg bg-gray-800 flex flex-col items-center gap-2`}
                key={account.id}
              >
                <input
                  type={"hidden"}
                  name={"appScopedUserId"}
                  value={appScopedUserId}
                />
                <input
                  type={"hidden"}
                  name={"shortLivedAccessToken"}
                  value={account.access_token}
                />
                <input
                  type={"hidden"}
                  name={"instagramBusinessAccountId"}
                  value={account.instagram_business_account.id}
                />
                <input
                  type={"hidden"}
                  name={"facebookPageId"}
                  value={account.id}
                />
                <input
                  type={"hidden"}
                  name={"instagramAccountName"}
                  value={account.name}
                />
                <input
                  type={"hidden"}
                  name={"pictureUrl"}
                  value={account.picture.data.url}
                />
                <input type={"hidden"} name={"userId"} value={userId} />

                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <img
                      src={account.picture.data.url}
                      alt={account.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <Icons.instagram className="absolute bottom-[-8px] right-[-8px] w-6 h-6 rounded-full" />
                  </div>
                  <p>{account.name} </p>
                </div>

                <Button type={"submit"}>Connect Account</Button>
              </form>
            ))}
        </div>

        {instagramAccounts.length + youtubeChannels.length > 0 && (
          <div className="mt-4">
            <Text intent={"title"} text={"Your Existing Accounts"} />
            <div
              className={
                "flex flex-wrap justify-center items-center gap-2 mt-4"
              }
            >
              {instagramAccounts.map((account) => (
                <div
                  className={`p-4 rounded-lg bg-gray-800 flex flex-col items-center gap-2`}
                  key={account.instagram_business_account_id}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8">
                      <img
                        src={account.picture_file_path}
                        alt={account.account_name}
                        className="w-8 h-8 rounded-full"
                      />
                      <Icons.instagram className="absolute bottom-[-8px] right-[-8px] w-6 h-6 rounded-full" />
                    </div>
                    <Text text={account.account_name} />
                    <button
                      onClick={() => {
                        setInstagramAccountToDelete(account);
                        setOpenConfirmDeleteModal(true);
                      }}
                      type={"submit"}
                    >
                      <XCircleIcon className="w-6 h-6 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
              {youtubeChannels.map((channel) => (
                <div
                  className={`p-4 rounded-lg bg-gray-800 flex flex-col items-center gap-2`}
                  key={channel.id}
                >
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8">
                      <img
                        src={channel.profile_picture_path}
                        alt={channel.channel_custom_url}
                        className="w-8 h-8 rounded-full"
                      />
                      <Icons.youtube className="absolute bottom-[-8px] right-[-8px] w-6 h-6 rounded-full" />
                    </div>
                    <Text text={channel.channel_custom_url} />
                    <button
                      onClick={() => {
                        setYoutubeChannelToDelete(channel);
                        setOpenConfirmDeleteModal(true);
                      }}
                      type={"submit"}
                    >
                      <XCircleIcon className="w-6 h-6 text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Modal
        open={openConfirmDeleteModal}
        setOpen={setOpenConfirmDeleteModal}
        onCloseCallback={() => {
          setInstagramAccountToDelete(undefined);
          setYoutubeChannelToDelete(undefined);
        }}
      >
        <Text text={"Are you sure you want to delete this account?"} />
        {constructSocialAccountBlock(
          instagramAccountToDelete,
          youtubeChannelToDelete
        )}
        <div className="flex items-center justify-center gap-2">
          <Button
            intent="secondary"
            onClick={() => setOpenConfirmDeleteModal(false)}
          >
            Cancel
          </Button>
          {instagramAccountToDelete && (
            <form action={deleteInstagramAccountFormAction}>
              <input
                type={"hidden"}
                name={"instagramBusinessAccountId"}
                value={instagramAccountToDelete.instagram_business_account_id}
              />
              <input type={"hidden"} name={"userId"} value={userId} />
              <Button intent="danger" type={"submit"}>
                Delete
              </Button>
            </form>
          )}
          {youtubeChannelToDelete && (
            <form action={deleteYoutubeChannelFormAction}>
              <input
                type={"hidden"}
                name={"youtubeChannelId"}
                value={youtubeChannelToDelete.id}
              />
              <input type={"hidden"} name={"userId"} value={userId} />
              <Button intent="danger" type={"submit"}>
                Delete
              </Button>
            </form>
          )}
        </div>
      </Modal>
    </>
  );
}
