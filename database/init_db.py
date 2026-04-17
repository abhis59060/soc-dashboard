"""
Database Initialization Script
Creates MongoDB collections and indexes
"""

from pymongo import MongoClient, ASCENDING, DESCENDING
import os


def init_database():
    """Initialize MongoDB database for SOC Dashboard"""
    
    # Connection parameters
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "soc_dashboard")
    
    print(f"Connecting to MongoDB: {mongo_url}")
    
    try:
        # Connect to MongoDB
        client = MongoClient(mongo_url)
        db = client[db_name]
        
        print(f"✅ Connected to database: {db_name}")
        
        # Create collections
        print("\n📦 Creating collections...")
        
        collections = ["logs", "alerts", "statistics"]
        for collection_name in collections:
            if collection_name not in db.list_collection_names():
                db.create_collection(collection_name)
                print(f"   ✅ Created collection: {collection_name}")
            else:
                print(f"   ⚠️  Collection already exists: {collection_name}")
        
        # Create indexes for logs collection
        print("\n🔍 Creating indexes for logs collection...")
        
        logs_collection = db.logs
        
        indexes = [
            ("timestamp", DESCENDING),
            ("severity", ASCENDING),
            ("os", ASCENDING),
            ("host", ASCENDING),
            ("source_ip", ASCENDING),
            ("log_type", ASCENDING),
        ]
        
        for field, direction in indexes:
            logs_collection.create_index([(field, direction)])
            print(f"   ✅ Created index: {field}")
        
        # Create compound indexes
        print("\n🔍 Creating compound indexes...")
        
        compound_indexes = [
            [("os", ASCENDING), ("severity", ASCENDING), ("timestamp", DESCENDING)],
            [("host", ASCENDING), ("timestamp", DESCENDING)],
            [("source_ip", ASCENDING), ("timestamp", DESCENDING)],
        ]
        
        for fields in compound_indexes:
            logs_collection.create_index(fields)
            field_names = ", ".join([f[0] for f in fields])
            print(f"   ✅ Created compound index: {field_names}")
        
        # Insert sample data (optional)
        print("\n📝 Database initialization complete!")
        print(f"\nDatabase Details:")
        print(f"   URL: {mongo_url}")
        print(f"   Database: {db_name}")
        print(f"   Collections: {', '.join(collections)}")
        
        # Test connection
        print("\n🧪 Testing connection...")
        stats = db.command("dbStats")
        print(f"   ✅ Database size: {stats['dataSize']} bytes")
        print(f"   ✅ Collections: {stats['collections']}")
        
        print("\n✅ Database initialization successful!")
        
        client.close()
    
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("SOC Dashboard - Database Initialization")
    print("=" * 60)
    init_database()
