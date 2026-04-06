from prisma import Prisma


class GroupService:
    def __init__(self, db: Prisma):
        self.db = db

    @staticmethod
    def _to_api_visibility(value: str) -> str:
        return "public" if value == "PUBLIC" else "private"

    async def create_group(self, user_id, name, description, visibility):
        requester = await self.db.user.find_unique(where={"id": user_id})
        if not requester:
            raise ValueError("User not found. Please log in again.")

        group = await self.db.group.create(data={
            "name": name,
            "description": description,
            "visibility": visibility.upper(),
            "members": {
                "create": {
                    "userId": user_id,
                    "role": "OWNER",
                }
            },
        })
        return group

    async def send_invite(self, user_id, group_id, receiverId):
        sender_membership = await self.db.groupmember.find_unique(
            where={"userId_groupId": {"userId": user_id, "groupId": group_id}}
        )
        if not sender_membership:
            raise ValueError("You are not a member of this group")

        receiver = await self.db.user.find_unique(where={"id": receiverId})
        if not receiver:
            raise ValueError("User not found")

        already_member = await self.db.groupmember.find_unique(
            where={"userId_groupId": {"userId": receiverId, "groupId": group_id}}
        )
        if already_member:
            raise ValueError("User is already a member")

        invite = await self.db.invite.upsert(
            where={"receiverId_groupId": {"receiverId": receiverId, "groupId": group_id}},
            data={
                "create": {"senderId": user_id, "receiverId": receiverId, "groupId": group_id},
                "update": {"senderId": user_id},
            },
        )
        return invite

    async def list_invites(self, user_id: int):
        invites = await self.db.invite.find_many(
            where={
                "OR": [
                    {"senderId": user_id},
                    {"receiverId": user_id},
                ]
            }
        )
        return invites

    async def accept_invite(self, user_id, invite_id):
        invite = await self.db.invite.find_unique(where={"id": invite_id})

        if not invite:
            raise ValueError("Invite not found")
        if invite.receiverId != user_id:
            raise ValueError("This invite is not for you")

        member = await self.db.groupmember.create(data={
            "userId": user_id,
            "groupId": invite.groupId,
            "role": "MEMBER",
        })
        await self.db.invite.delete(where={"id": invite_id})

        return member

    async def list_groups(self, user_id):
        memberships = await self.db.groupmember.find_many(
            where={"userId": user_id},
            include={
                "group": {
                    "include": {
                        "posts": {
                            "order_by": {"createdAt": "desc"},
                            "take": 1,
                            "include": {"author": True},
                        },
                        "members": True,
                    }
                }
            },
        )

        return [
            {
                "groupId": m.groupId,
                "name": m.group.name,
                "role": m.role,
                "description": m.group.description or "",
                "member_count": len(m.group.members),
                "visibility": self._to_api_visibility(m.group.visibility),
                "lastPost": {
                    "content": m.group.posts[0].content,
                    "author": m.group.posts[0].author.username,
                    "createdAt": m.group.posts[0].createdAt,
                } if m.group.posts else None,
            }
            for m in memberships
        ]

    async def list_public_groups(self, user_id):
        memberships = await self.db.groupmember.find_many(where={"userId": user_id})
        my_group_ids = {membership.groupId for membership in memberships}

        groups = await self.db.group.find_many(
            where={"visibility": "PUBLIC"},
            include={"members": True},
        )

        public_groups = []
        for group in groups:
            if group.id in my_group_ids:
                continue

            owner_id = next((member.userId for member in group.members if member.role == "OWNER"), 0)

            public_groups.append(
                {
                    "id": group.id,
                    "name": group.name,
                    "description": group.description or "",
                    "member_count": len(group.members),
                    "invite_code": "",
                    "visibility": self._to_api_visibility(group.visibility),
                    "creator_id": owner_id,
                    "created_at": group.createdAt,
                    "cover_url": None,
                }
            )

        return public_groups

    async def remove_member(self, user_id, group_id, member_id):
        requester = await self.db.groupmember.find_unique(
            where={"userId_groupId": {"userId": user_id, "groupId": group_id}}
        )
        if not requester:
            raise ValueError("You are not a member of this group")

        # allow self-removal, otherwise require OWNER
        if user_id != member_id and requester.role != "OWNER":
            raise ValueError("Only the owner can remove other members")

        target = await self.db.groupmember.find_unique(
            where={"userId_groupId": {"userId": member_id, "groupId": group_id}}
        )
        if not target:
            raise ValueError("Member not found in this group")

        # prevent removing the owner
        if target.role == "OWNER":
            raise ValueError("Cannot remove the group owner")

        await self.db.groupmember.delete(
            where={"userId_groupId": {"userId": member_id, "groupId": group_id}}
        )

    async def delete_group(self, user_id, group_id):
        requester = await self.db.groupmember.find_unique(
            where={"userId_groupId": {"userId": user_id, "groupId": group_id}}
        )
        if not requester:
            raise ValueError("You are not a member of this group")

        if requester.role != "OWNER":
            raise ValueError("Only the owner can delete this group")

        await self.db.group.delete(where={"id": group_id})
