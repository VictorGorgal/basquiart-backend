from prisma import Prisma


class GroupService:
    def __init__(self, db: Prisma):
        self.db = db

    async def create_group(self):
        return {"success": True}

    async def send_invite(self):
        return {"success": True}

    async def list_invites(self):
        return {"success": True}

    async def accept_invite(self):
        return {"success": True}

    async def list_groups(self):
        return {"success": True}

    async def remove_member(self):
        return {"success": True}

    async def delete_group(self):
        return {"success": True}
