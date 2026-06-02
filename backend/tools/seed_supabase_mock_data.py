from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from backend.lib.supabase_client import SupabaseError, supabase_client


def load_environment() -> None:
    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent.parent

    for candidate in (
        project_root / ".env",
        project_root / "backend" / ".env",
        script_dir.parent / ".env",
    ):
        if candidate.exists():
            load_dotenv(candidate, override=False)


def seed() -> None:
    if not supabase_client.is_configured():
        raise RuntimeError("Supabase is not configured in the environment")

    users = [
        {
            "id": "8b61fd6c-2d71-4d13-8c76-9f5b3d9d0001",
            "email": "abu.bakar.demo@kebunkita.local",
            "full_name": "Abu Bakar",
            "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
            "access_type": "free",
            "provider": "guest",
            "is_guest": False,
            "location_text": "Tanjung Malim",
        },
        {
            "id": "8b61fd6c-2d71-4d13-8c76-9f5b3d9d0002",
            "email": "siti.aminah.demo@kebunkita.local",
            "full_name": "Siti Aminah",
            "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80",
            "access_type": "free",
            "provider": "guest",
            "is_guest": False,
            "location_text": "Taman Bayu",
        },
        {
            "id": "8b61fd6c-2d71-4d13-8c76-9f5b3d9d0003",
            "email": "uncle.lim.demo@kebunkita.local",
            "full_name": "Uncle Lim",
            "avatar_url": "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=160&q=80",
            "access_type": "premium",
            "provider": "guest",
            "is_guest": False,
            "location_text": "Taman Melawati",
        },
    ]

    communities = [
        {
            "id": "7f4f49f1-57f6-4e0b-93c5-8b4a92010001",
            "name": "Perumahan Tanjung Malim",
            "description": "Balcony growers and backyard gardeners around Tanjung Malim.",
            "visibility": "public",
            "image_url": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80",
            "created_by": users[0]["id"],
        },
        {
            "id": "7f4f49f1-57f6-4e0b-93c5-8b4a92010002",
            "name": "Taman Melawati Growers",
            "description": "Friendly community for urban herbs, greens, and harvest exchange.",
            "visibility": "public",
            "image_url": "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=800&q=80",
            "created_by": users[2]["id"],
        },
    ]

    community_members = [
        {
            "id": "9b7e7a4b-cb2d-43bb-944e-73f57b2d0001",
            "community_id": communities[0]["id"],
            "user_id": users[0]["id"],
            "role": "owner",
            "status": "active",
        },
        {
            "id": "9b7e7a4b-cb2d-43bb-944e-73f57b2d0002",
            "community_id": communities[0]["id"],
            "user_id": users[1]["id"],
            "role": "member",
            "status": "active",
        },
        {
            "id": "9b7e7a4b-cb2d-43bb-944e-73f57b2d0003",
            "community_id": communities[1]["id"],
            "user_id": users[2]["id"],
            "role": "owner",
            "status": "active",
        },
    ]

    plants = [
        {
            "id": "3c8f8cb0-bf94-4f6e-bf65-1b0a0d190001",
            "user_id": users[0]["id"],
            "community_id": communities[0]["id"],
            "name": "Bird's Eye Chili",
            "category": "vegetable",
            "plant_type": "vegetable",
            "image_url": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=900&q=80",
            "photo_url": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=900&q=80",
            "planted_date": "2026-04-25",
            "date_planted": "2026-04-25",
            "location": "Front Porch Pot",
            "garden_location": "Front Porch Pot",
            "sunlight": "full_sun",
            "sunlight_requirement": "full_sun",
            "watering_frequency": "daily",
            "growth_percentage": 63,
            "growth_percent": 63,
            "estimated_harvest_date": "2026-07-24",
            "status": "active",
        },
        {
            "id": "3c8f8cb0-bf94-4f6e-bf65-1b0a0d190002",
            "user_id": users[1]["id"],
            "community_id": communities[0]["id"],
            "name": "Cherry Tomato",
            "category": "vegetable",
            "plant_type": "vegetable",
            "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
            "photo_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
            "planted_date": "2026-05-18",
            "date_planted": "2026-05-18",
            "location": "South Sector, Row 4",
            "garden_location": "South Sector, Row 4",
            "sunlight": "full_sun",
            "sunlight_requirement": "full_sun",
            "watering_frequency": "every_2_days",
            "growth_percentage": 75,
            "growth_percent": 75,
            "estimated_harvest_date": "2026-07-05",
            "status": "active",
        },
        {
            "id": "3c8f8cb0-bf94-4f6e-bf65-1b0a0d190003",
            "user_id": users[1]["id"],
            "community_id": communities[0]["id"],
            "name": "Kangkung",
            "category": "leafy_green",
            "plant_type": "leafy_green",
            "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80",
            "photo_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80",
            "planted_date": "2026-05-27",
            "date_planted": "2026-05-27",
            "location": "Balcony Planter 2",
            "garden_location": "Balcony Planter 2",
            "sunlight": "partial_shade",
            "sunlight_requirement": "partial",
            "watering_frequency": "daily",
            "growth_percentage": 28,
            "growth_percent": 28,
            "estimated_harvest_date": "2026-06-24",
            "status": "active",
        },
        {
            "id": "3c8f8cb0-bf94-4f6e-bf65-1b0a0d190004",
            "user_id": users[2]["id"],
            "community_id": communities[1]["id"],
            "name": "Mint",
            "category": "herb",
            "plant_type": "herb",
            "image_url": "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=900&q=80",
            "photo_url": "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=900&q=80",
            "planted_date": "2026-05-10",
            "date_planted": "2026-05-10",
            "location": "Kitchen Window Box",
            "garden_location": "Kitchen Window Box",
            "sunlight": "partial_shade",
            "sunlight_requirement": "partial",
            "watering_frequency": "daily",
            "growth_percentage": 58,
            "growth_percent": 58,
            "estimated_harvest_date": "2026-06-20",
            "status": "active",
        },
    ]

    community_posts = [
        {
            "id": "f1cae4b8-f4ae-4a67-a33a-442f66100001",
            "user_id": users[1]["id"],
            "community_id": communities[0]["id"],
            "post_type": "progress",
            "body": "My cherry tomatoes are finally turning bright red. Moving the planters into morning sun made a huge difference this week.",
            "plant_id": plants[1]["id"],
            "location_text": "Tanjung Malim",
        },
        {
            "id": "f1cae4b8-f4ae-4a67-a33a-442f66100002",
            "user_id": users[0]["id"],
            "community_id": communities[0]["id"],
            "post_type": "question",
            "body": "Why are my chili leaves curling after the recent heat? I moved the pot into afternoon shade but the new leaves still look stressed.",
            "plant_id": plants[0]["id"],
            "location_text": "Perumahan Tanjung Malim",
        },
        {
            "id": "f1cae4b8-f4ae-4a67-a33a-442f66100003",
            "user_id": users[2]["id"],
            "community_id": communities[1]["id"],
            "post_type": "tip",
            "body": "I have extra basil cuttings and starter trays for beginners. Message me if you want to collect them this weekend.",
            "plant_id": plants[3]["id"],
            "location_text": "Taman Melawati",
        },
        {
            "id": "f1cae4b8-f4ae-4a67-a33a-442f66100004",
            "user_id": users[0]["id"],
            "community_id": communities[0]["id"],
            "post_type": "harvest",
            "body": "Fresh red chillies harvested this morning. Open to swap with leafy greens or herbs from nearby growers.",
            "plant_id": plants[0]["id"],
            "location_text": "Tanjung Malim",
        },
    ]

    post_media = [
        {
            "id": "2b39d0f9-8f9a-46b4-9eef-9b7746f20001",
            "post_id": community_posts[0]["id"],
            "media_url": plants[1]["image_url"],
            "media_type": "image",
            "sort_order": 0,
        },
        {
            "id": "2b39d0f9-8f9a-46b4-9eef-9b7746f20002",
            "post_id": community_posts[1]["id"],
            "media_url": plants[0]["image_url"],
            "media_type": "image",
            "sort_order": 0,
        },
        {
            "id": "2b39d0f9-8f9a-46b4-9eef-9b7746f20003",
            "post_id": community_posts[2]["id"],
            "media_url": plants[3]["image_url"],
            "media_type": "image",
            "sort_order": 0,
        },
        {
            "id": "2b39d0f9-8f9a-46b4-9eef-9b7746f20004",
            "post_id": community_posts[3]["id"],
            "media_url": plants[0]["image_url"],
            "media_type": "image",
            "sort_order": 0,
        },
    ]

    marketplace_listings = [
        {
            "id": "5d447e7f-c05b-4e97-a43f-4bd5e88a0001",
            "user_id": users[0]["id"],
            "title": "Fresh Red Chillies",
            "crop_name": "Bird's Eye Chili",
            "description": "Freshly harvested from my porch garden. Great for sambal or stir-fry.",
            "quantity": "500g",
            "price_amount": None,
            "price_unit": None,
            "listing_type": "barter",
            "location_text": "Tanjung Malim",
            "is_organic": True,
            "is_pesticide_free": True,
            "harvested_at": "2026-06-01",
            "status": "active",
        },
        {
            "id": "5d447e7f-c05b-4e97-a43f-4bd5e88a0002",
            "user_id": users[1]["id"],
            "title": "Baby Carrots Bundle",
            "crop_name": "Baby Carrots",
            "description": "Sweet carrots from a raised bed. Ready for pickup this week.",
            "quantity": "1.5kg",
            "price_amount": 6.50,
            "price_unit": "RM/kg",
            "listing_type": "sell",
            "location_text": "Taman Bayu",
            "is_organic": False,
            "is_pesticide_free": True,
            "harvested_at": "2026-05-31",
            "status": "active",
        },
        {
            "id": "5d447e7f-c05b-4e97-a43f-4bd5e88a0003",
            "user_id": users[2]["id"],
            "title": "Herb Starter Pack",
            "crop_name": "Mixed Herbs",
            "description": "Mint and basil starter pots. Open to exchange or simple giveaway for beginners.",
            "quantity": "6 small pots",
            "price_amount": None,
            "price_unit": None,
            "listing_type": "both",
            "location_text": "Taman Melawati",
            "is_organic": True,
            "is_pesticide_free": True,
            "harvested_at": None,
            "status": "active",
        },
    ]

    listing_media = [
        {
            "id": "6a6ca5b3-4d02-4db4-b5fd-812efc210001",
            "listing_id": marketplace_listings[0]["id"],
            "media_url": plants[0]["image_url"],
            "media_type": "image",
            "sort_order": 0,
        },
        {
            "id": "6a6ca5b3-4d02-4db4-b5fd-812efc210002",
            "listing_id": marketplace_listings[1]["id"],
            "media_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=900&q=80",
            "media_type": "image",
            "sort_order": 0,
        },
        {
            "id": "6a6ca5b3-4d02-4db4-b5fd-812efc210003",
            "listing_id": marketplace_listings[2]["id"],
            "media_url": "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=900&q=80",
            "media_type": "image",
            "sort_order": 0,
        },
    ]

    post_reactions = [
        {
            "id": "fd33b6f8-73f9-4d77-a7bf-2e9e14340001",
            "post_id": community_posts[0]["id"],
            "user_id": users[0]["id"],
            "reaction_type": "like",
        },
        {
            "id": "fd33b6f8-73f9-4d77-a7bf-2e9e14340002",
            "post_id": community_posts[1]["id"],
            "user_id": users[1]["id"],
            "reaction_type": "like",
        },
    ]

    post_comments = [
        {
            "id": "c66ca2b4-f31a-4944-9162-7310c0af0001",
            "post_id": community_posts[1]["id"],
            "user_id": users[2]["id"],
            "body": "Try checking the underside of the leaves too. Heat plus aphids often show up together.",
            "comment_type": "solution",
        },
        {
            "id": "c66ca2b4-f31a-4944-9162-7310c0af0002",
            "post_id": community_posts[0]["id"],
            "user_id": users[0]["id"],
            "body": "The color looks great. How often are you feeding them?",
            "comment_type": "comment",
        },
    ]

    chat_rooms = [
        {
            "id": "4e4ea0a3-9ff0-4f67-bf8f-9d0d21000001",
            "marketplace_item_id": marketplace_listings[0]["id"],
            "buyer_id": users[1]["id"],
            "seller_id": users[0]["id"],
        },
    ]

    messages = [
        {
            "id": "1d62ee5f-3dc7-46ee-90f7-684d73000001",
            "chat_room_id": chat_rooms[0]["id"],
            "sender_id": users[1]["id"],
            "message": "Hi Abu, are the chillies still available?",
            "is_read": True,
        },
        {
            "id": "1d62ee5f-3dc7-46ee-90f7-684d73000002",
            "chat_room_id": chat_rooms[0]["id"],
            "sender_id": users[0]["id"],
            "message": "Yes, still available. I can barter with kangkung.",
            "is_read": True,
        },
        {
            "id": "1d62ee5f-3dc7-46ee-90f7-684d73000003",
            "chat_room_id": chat_rooms[0]["id"],
            "sender_id": users[1]["id"],
            "message": "Great, I have fresh kangkung from Tanjung Malim.",
            "is_read": True,
        },
        {
            "id": "1d62ee5f-3dc7-46ee-90f7-684d73000004",
            "chat_room_id": chat_rooms[0]["id"],
            "sender_id": users[0]["id"],
            "message": "Nice, let's exchange this evening.",
            "is_read": False,
        },
    ]

    supabase_client.upsert("users", users, on_conflict="id")
    supabase_client.upsert("communities", communities, on_conflict="id")
    supabase_client.upsert("community_members", community_members, on_conflict="community_id,user_id")
    supabase_client.upsert("plants", plants, on_conflict="id")
    supabase_client.upsert("community_posts", community_posts, on_conflict="id")
    supabase_client.upsert("post_media", post_media, on_conflict="id")
    supabase_client.upsert("marketplace_listings", marketplace_listings, on_conflict="id")
    supabase_client.upsert("listing_media", listing_media, on_conflict="id")
    supabase_client.upsert("post_reactions", post_reactions, on_conflict="post_id,user_id,reaction_type")
    supabase_client.upsert("post_comments", post_comments, on_conflict="id")

    try:
        supabase_client.upsert("chat_rooms", chat_rooms, on_conflict="marketplace_item_id,buyer_id,seller_id")
        supabase_client.upsert("messages", messages, on_conflict="id")
        chat_note = " marketplace chat,"
    except SupabaseError as exc:
        error_text = str(exc).lower()
        if "relation" in error_text or "could not find the table" in error_text or "pgrst205" in error_text:
            chat_note = " marketplace chat skipped (run the latest SQL migration first),"
        else:
            raise

    print(f"Seeded Supabase with mock users, communities, plants, feed posts,{chat_note} and marketplace listings.")


if __name__ == "__main__":
    load_environment()
    seed()
