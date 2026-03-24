from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, UploadFile, File

from features.auth.utils import get_current_user
from features.post.image_handler import image_handler
from features.post.service import PostService
from features.post.schema import RatePostBody, PaginatedPostsResponse
from features.core.database import db

router = APIRouter(prefix="/posts", tags=["posts"])
service = PostService(db, image_handler)


@router.get("/{group_id}", response_model=PaginatedPostsResponse)
async def get_posts(
        group_id: int,
        user_id: int = Depends(get_current_user),
        page: int = Query(default=1, ge=1),
        page_size: int = Query(default=10, ge=1, le=100),
):
    try:
        posts = await service.get_posts(user_id, group_id, page, page_size)
        return posts
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{group_id}", status_code=status.HTTP_201_CREATED)
async def make_post(
        group_id: int,
        content: str = Form(...),
        images: List[UploadFile] = File(default=[]),
        user_id: int = Depends(get_current_user),
):
    try:
        return await service.make_post(user_id, group_id, content, images)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
        post_id: int,
        user_id: int = Depends(get_current_user),
):
    try:
        await service.delete_post(user_id, post_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{post_id}/like")
async def toggle_like(
    post_id: int,
    user_id: int = Depends(get_current_user),
):
    try:
        return await service.toggle_like(user_id, post_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{post_id}/rate")
async def rate_post(
    post_id: int,
    body: RatePostBody,
    user_id: int = Depends(get_current_user),
):
    try:
        return await service.rate_post(user_id, post_id, body.ratings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
