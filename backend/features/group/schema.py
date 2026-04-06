from pydantic import BaseModel, field_validator


class GroupVisibility(str):
    PUBLIC = "public"
    PRIVATE = "private"


class CreateGroupBody(BaseModel):
    name: str
    description: str | None = None
    visibility: str = GroupVisibility.PRIVATE

    @field_validator("visibility")
    @classmethod
    def validate_visibility(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {GroupVisibility.PUBLIC, GroupVisibility.PRIVATE}:
            raise ValueError("visibility must be 'public' or 'private'")
        return normalized


class SendInviteBody(BaseModel):
    group_id: int
    receiverId: int
