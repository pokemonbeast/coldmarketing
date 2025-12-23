import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// CrowdReply API - Create Comment Task
// Endpoint: POST https://crowdreply.io/api/tasks
// Header: x-api-key
// Documentation: https://documenter.getpostman.com/view/5613076/2sB2qi9xwq

interface CrowdReplyCommentTaskRequest {
  taskData: {
    taskType: "comment";
    type: "RedditCommentTask";
    platform: "reddit";
    project: string;
    content: string;
    threadUrl: string;
  };
  scheduleAt?: string; // YYYY-MM-DDT00:00:00
  shouldAssignOP?: boolean;
}

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check admin status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get CrowdReply providers
    const { data: providers, error } = await supabase
      .from("api_providers")
      .select("*")
      .eq("provider_type", "crowdreply")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      providers,
    });
  } catch (error) {
    console.error("Error fetching CrowdReply providers:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch providers" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Check admin status
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, providerId, params } = body;

    // Get provider details
    const { data: provider, error: providerError } = await supabase
      .from("api_providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (providerError || !provider) {
      return NextResponse.json(
        { success: false, error: "Provider not found" },
        { status: 404 }
      );
    }

    // Get decrypted API key from provider
    const apiKey = provider.api_key_encrypted;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "API key not configured" },
        { status: 400 }
      );
    }

    // Get project ID from provider config
    const config = provider.config as Record<string, unknown> | null;
    const defaultProjectId = config?.project_id as string | undefined;

    if (action === "create_comment") {
      // Create Comment Task
      if (!params.content || !params.threadUrl) {
        return NextResponse.json(
          { success: false, error: "Content and threadUrl are required" },
          { status: 400 }
        );
      }

      const projectId = params.project || defaultProjectId;
      if (!projectId) {
        return NextResponse.json(
          { success: false, error: "Project ID is required. Set it in provider config or provide in params." },
          { status: 400 }
        );
      }

      // Validate threadUrl is a valid Reddit post URL
      const redditUrlPattern = /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/comments\/[^/]+/;
      if (!redditUrlPattern.test(params.threadUrl)) {
        return NextResponse.json(
          { success: false, error: "Invalid Reddit post URL. Must be in format: https://www.reddit.com/r/subreddit/comments/..." },
          { status: 400 }
        );
      }

      const taskPayload: CrowdReplyCommentTaskRequest = {
        taskData: {
          taskType: "comment",
          type: "RedditCommentTask",
          platform: "reddit",
          project: projectId,
          content: params.content,
          threadUrl: params.threadUrl,
        },
      };

      // Add optional scheduleAt
      if (params.scheduleAt) {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
        if (!dateRegex.test(params.scheduleAt)) {
          return NextResponse.json(
            { success: false, error: "Invalid scheduleAt format. Use YYYY-MM-DDTHH:MM:SS" },
            { status: 400 }
          );
        }
        taskPayload.scheduleAt = params.scheduleAt;
      }

      // Add optional shouldAssignOP
      if (params.shouldAssignOP !== undefined) {
        taskPayload.shouldAssignOP = params.shouldAssignOP;
      }

      console.log("Creating CrowdReply comment task:", JSON.stringify(taskPayload, null, 2));

      // Make API request to CrowdReply
      const response = await fetch("https://crowdreply.io/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(taskPayload),
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        console.error("CrowdReply API error:", response.status, responseData);
        return NextResponse.json({
          success: false,
          error: `CrowdReply API error: ${response.status}`,
          result: responseData,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        action: "create_comment",
        result: responseData,
        request_sent: taskPayload,
        timestamp: new Date().toISOString(),
      });

    } else if (action === "get_projects") {
      // Get Projects - useful for finding the project ID
      const response = await fetch("https://crowdreply.io/api/projects", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `CrowdReply API error: ${response.status}`,
          result: responseData,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        action: "get_projects",
        result: responseData,
        timestamp: new Date().toISOString(),
      });

    } else if (action === "get_balance") {
      // Get Remaining Balance
      const response = await fetch("https://crowdreply.io/api/balance", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `CrowdReply API error: ${response.status}`,
          result: responseData,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        action: "get_balance",
        result: responseData,
        timestamp: new Date().toISOString(),
      });

    } else if (action === "get_task") {
      // Get Task by ID
      if (!params.taskId) {
        return NextResponse.json(
          { success: false, error: "Task ID is required" },
          { status: 400 }
        );
      }

      const response = await fetch(`https://crowdreply.io/api/tasks/${params.taskId}`, {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `CrowdReply API error: ${response.status}`,
          result: responseData,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        action: "get_task",
        result: responseData,
        timestamp: new Date().toISOString(),
      });

    } else if (action === "get_tasks") {
      // Get All Tasks
      const response = await fetch("https://crowdreply.io/api/tasks", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
        },
      });

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `CrowdReply API error: ${response.status}`,
          result: responseData,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        action: "get_tasks",
        result: responseData,
        timestamp: new Date().toISOString(),
      });

    } else {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("CrowdReply test error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Request failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}


