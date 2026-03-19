import asyncio
from prisma import Prisma


async def main():
    db = Prisma()
    await db.connect()

    categories = ["Technique", "Creativity", "Composition"]
    for name in categories:
        await db.ratingcategory.upsert(
            where={"name": name},
            data={"create": {"name": name}, "update": {}},
        )
        print(f"seeded category: {name}")

    await db.disconnect()


asyncio.run(main())
