from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from enum import Enum


class RatingCategoryName(str, Enum):
    TECHNIQUE = "Technique"
    CREATIVITY = "Creativity"
    COMPOSITION = "Composition"


class CategoryRating(BaseModel):
    category: RatingCategoryName
    score: int = Field(ge=1, le=5)


class RatePostBody(BaseModel):
    ratings: list[CategoryRating]

    @field_validator("ratings")
    @classmethod
    def validate_all_categories(cls, v):
        if len(v) != 3:
            raise ValueError("You must rate all 3 categories")

        provided = {r.category for r in v}
        required = {RatingCategoryName.TECHNIQUE, RatingCategoryName.CREATIVITY, RatingCategoryName.COMPOSITION}
        if provided != required:
            raise ValueError(f"Missing categories: {required - provided}")

        return v


class AuthorResponse(BaseModel):
    id: int
    username: str
    createdAt: datetime

    class Config:
        from_attributes = True


class ImageResponse(BaseModel):
    id: int
    url: str

    class Config:
        from_attributes = True


class CategoryAverageResponse(BaseModel):
    category: str
    average: float
    totalVotes: int


class LikeResponse(BaseModel):
    totalLikes: int
    hasLiked: bool


class PostResponse(BaseModel):
    id: int
    content: str
    createdAt: datetime
    authorId: int
    groupId: int
    author: AuthorResponse | None = None
    images: list[ImageResponse] | None = None
    ratings: list[CategoryAverageResponse] | None = None
    likes: LikeResponse | None = None

    class Config:
        from_attributes = True


class PaginatedPostsResponse(BaseModel):
    page: int
    pageSize: int
    total: int
    totalPages: int
    posts: list[PostResponse]
