from pydantic import BaseModel


class CreateGroupBody(BaseModel):
    name: str
    description: str | None = None


class SendInviteBody(BaseModel):
    group_id: int
    receiverId: int
