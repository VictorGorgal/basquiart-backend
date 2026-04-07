from prisma import Prisma
from features.post.image_handler import ImageHandler


def _aggregate_ratings(ratings) -> list[dict]:
    grouped = {}
    for r in ratings:
        name = r.category.name
        if name not in grouped:
            grouped[name] = []
        grouped[name].append(r.score)

    return [
        {
            "category": name,
            "average": round(sum(scores) / len(scores), 1),
            "totalVotes": len(scores),
        }
        for name, scores in grouped.items()
    ]


class PostService:
    def __init__(self, db: Prisma, image_handler: ImageHandler):
        self.db = db
        self.image_handler = image_handler

    async def assertUserIsMemberOfGroup(self, user_id, group_id):
        membership = await self.db.groupmember.find_unique(
            where={"userId_groupId": {"userId": user_id, "groupId": group_id}}
        )

        if not membership:
            raise ValueError("You are not a member of this group")

    async def get_posts(self, user_id, group_id, page, page_size):
        await self.assertUserIsMemberOfGroup(user_id, group_id)

        skip = (page - 1) * page_size

        posts = await self.db.post.find_many(
            where={"groupId": group_id},
            order={"createdAt": "desc"},
            skip=skip,
            take=page_size,
            include={
                "author": True,
                "images": True,
                "ratings": {"include": {"category": True}},
                "likes": True,
                "comments": True,
            },
        )

        total = await self.db.post.count(where={"groupId": group_id})

        return {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": -(-total // page_size),
            "posts": [
                {
                    **post.dict(),
                    "ratings": _aggregate_ratings(post.ratings),
                    "likes": {
                        "totalLikes": len(post.likes),
                        "hasLiked": any(like.userId == user_id for like in post.likes),
                    },
                    "commentCount": len(post.comments),
                }
                for post in posts
            ],
        }

    async def make_post(self, user_id, group_id, content, images):
        image_urls = []

        try:
            for image in images:
                url = await self.image_handler.save(image)
                image_urls.append(url)

            await self.assertUserIsMemberOfGroup(user_id, group_id)

            post = await self.db.post.create(
                data={
                    "content": content,
                    "authorId": user_id,
                    "groupId": group_id,
                    "images": {
                        "create": [{"url": url} for url in image_urls]
                    },
                },
                include={"images": True},
            )
            return post
        except ValueError as e:
            # clean up any saved files if something fails and rethrow error
            for url in image_urls:
                self.image_handler.delete(url)

            raise e

    async def delete_post(self, user_id, post_id):
        """Returns list of image URLs so the router can delete the files after."""
        post = await self.db.post.find_unique(
            where={"id": post_id},
            include={
                "images": True,
                "group": {"include": {"members": True}},
            },
        )
        if not post:
            raise ValueError("Post not found")

        is_author = post.authorId == user_id
        is_owner = any(
            m.userId == user_id and m.role == "OWNER"
            for m in post.group.members
        )
        if not is_author and not is_owner:
            raise ValueError("You can only delete your own posts")

        await self.db.post.delete(where={"id": post_id})
        image_urls = [img.url for img in post.images]

        for url in image_urls:
            self.image_handler.delete(url)

    async def toggle_like(self, user_id, post_id):
        post = await self.db.post.find_unique(where={"id": post_id})
        if not post:
            raise ValueError("Post not found")

        existing = await self.db.postlike.find_unique(
            where={"userId_postId": {"userId": user_id, "postId": post_id}}
        )

        if existing:
            await self.db.postlike.delete(
                where={"userId_postId": {"userId": user_id, "postId": post_id}}
            )
            return {"liked": False}
        else:
            await self.db.postlike.create(data={"userId": user_id, "postId": post_id})
            return {"liked": True}

    async def rate_post(self, user_id: int, post_id: int, ratings: list) -> list:
        post = await self.db.post.find_unique(
            where={"id": post_id},
            include={"images": True},
        )
        if not post:
            raise ValueError("Post not found")

        if not post.images:
            raise ValueError("You can only rate posts that have images")

        if post.authorId == user_id:
            raise ValueError("You cannot rate your own post")

        results = []
        for item in ratings:
            category = await self.db.ratingcategory.find_unique(where={"name": item.category})
            if not category:
                raise ValueError(f"Category '{item.category}' not found")

            rating = await self.db.postrating.upsert(
                where={"userId_postId_categoryId": {
                    "userId": user_id,
                    "postId": post_id,
                    "categoryId": category.id,
                }},
                data={
                    "create": {"userId": user_id, "postId": post_id, "categoryId": category.id, "score": item.score},
                    "update": {"score": item.score},
                },
            )
            results.append(rating)

        return results

    async def get_comments(self, user_id: int, post_id: int):
        post = await self.db.post.find_unique(where={"id": post_id}, include={"group": True})
        if not post:
            raise ValueError("Post not found")

        await self.assertUserIsMemberOfGroup(user_id, post.groupId)

        return await self.db.postcomment.find_many(
            where={"postId": post_id},
            order={"createdAt": "asc"},
            include={"user": True},
        )

    async def create_comment(self, user_id: int, post_id: int, content: str):
        post = await self.db.post.find_unique(where={"id": post_id}, include={"group": True})
        if not post:
            raise ValueError("Post not found")

        await self.assertUserIsMemberOfGroup(user_id, post.groupId)

        clean_content = content.strip()
        if not clean_content:
            raise ValueError("Comment cannot be empty")

        return await self.db.postcomment.create(
            data={
                "content": clean_content,
                "userId": user_id,
                "postId": post_id,
            },
            include={"user": True},
        )
