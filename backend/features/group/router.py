from fastapi import APIRouter, Depends, HTTPException, status

from features.auth.utils import get_current_user
from features.group.service import GroupService
from features.group.schema import CreateGroupBody, SendInviteBody
from features.core.database import db

router = APIRouter(prefix="/group", tags=["group"])
service = GroupService(db)


@router.post("/create", status_code=status.HTTP_201_CREATED)
async def create_group(
        body: CreateGroupBody,
        user_id: int = Depends(get_current_user),
):
    try:
        group = await service.create_group(user_id, body.name, body.description, body.visibility)
        return group
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invite")
async def send_invite(
        body: SendInviteBody,
        user_id: int = Depends(get_current_user),
):
    try:
        invite = await service.send_invite(user_id, body.group_id, body.receiverId)
        return invite
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invites")
async def list_invites(
        user_id: int = Depends(get_current_user),
):
    try:
        invites = await service.list_invites(user_id)
        return invites
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invites/{invite_id}/accept")
async def accept_invite(
        invite_id: int,
        user_id: int = Depends(get_current_user),
):
    try:
        member = await service.accept_invite(user_id, invite_id)
        return member
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/")
async def list_my_groups(user_id: int = Depends(get_current_user)):
    try:
        groups = await service.list_groups(user_id)
        return groups
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/public")
async def list_public_groups(user_id: int = Depends(get_current_user)):
    try:
        return await service.list_public_groups(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{group_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
        group_id: int,
        member_id: int,
        user_id: int = Depends(get_current_user),
):
    try:
        await service.remove_member(user_id, group_id, member_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group(
        group_id: int,
        user_id: int = Depends(get_current_user),
):
    try:
        await service.delete_group(user_id, group_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
