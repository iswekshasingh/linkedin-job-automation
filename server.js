require("dotenv").config()

const express = require("express")
const puppeteer = require("puppeteer")
const nodemailer = require("nodemailer")

const app = express()

app.get("/", async (req, res) => {

  try {

    console.log("\n========== STARTING AUTOMATION ==========\n")

    // GMAIL TRANSPORTER
    const transporter =
      nodemailer.createTransport({

        service: "gmail",

        auth: {
          user: process.env.GMAIL_EMAIL,
          pass: process.env.GMAIL_APP_PASSWORD
        }

      })

    // OPEN BROWSER
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      slowMo: 50
    })

    const page = await browser.newPage()

    // OPEN LINKEDIN LOGIN
    await page.goto(
      "https://www.linkedin.com/login",
      {
        waitUntil: "networkidle2"
      }
    )

    console.log("✅ LinkedIn opened")

    // WAIT
    await new Promise(resolve =>
      setTimeout(resolve, 5000)
    )

    // INSERT LOGIN DETAILS
    await page.evaluate((email, password) => {

      const emailInput =
        document.querySelector(
          'input[type="text"], input[type="email"]'
        )

      const passwordInput =
        document.querySelector(
          'input[type="password"]'
        )

      if (emailInput) {

        emailInput.value = email

        emailInput.dispatchEvent(
          new Event("input", {
            bubbles: true
          })
        )
      }

      if (passwordInput) {

        passwordInput.value = password

        passwordInput.dispatchEvent(
          new Event("input", {
            bubbles: true
          })
        )
      }

    },
    process.env.LINKEDIN_EMAIL,
    process.env.LINKEDIN_PASSWORD
    )

    console.log("✅ Credentials inserted")

    // CLICK LOGIN
    await page.evaluate(() => {

      const button =
        document.querySelector(
          'button[type="submit"]'
        )

      if (button) {
        button.click()
      }

    })

    console.log("✅ Login clicked")

    // WAIT AFTER LOGIN
    await new Promise(resolve =>
      setTimeout(resolve, 10000)
    )

    // OPEN SEARCH PAGE
    await page.goto(
      "https://www.linkedin.com/search/results/content/?keywords=java%20developer%20contract",
      {
        waitUntil: "networkidle2"
      }
    )

    console.log("✅ Search page opened")

    // WAIT
    await new Promise(resolve =>
      setTimeout(resolve, 6000)
    )

    // AUTO SCROLL
    await page.evaluate(async () => {

      await new Promise((resolve) => {

        let totalHeight = 0
        const distance = 500

        const timer = setInterval(() => {

          window.scrollBy(0, distance)

          totalHeight += distance

          if (totalHeight >= 3000) {

            clearInterval(timer)

            resolve()

          }

        }, 500)

      })

    })

    console.log("✅ Page scrolled")

    // SCRAPE POSTS
    const posts = await page.evaluate(() => {

      const results = []

      const textBlocks =
        document.querySelectorAll("div")

      textBlocks.forEach((block) => {

        const text =
          block.innerText?.trim()

        if (
          text &&
          text.length > 100 &&
          (
            text.toLowerCase().includes("java developer") ||
            text.toLowerCase().includes("contract")
          )
        ) {

          // EMAIL EXTRACTION
          const emailMatch =
            text.match(
              /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
            )

          results.push({

            recruiterEmail:
              emailMatch
                ? emailMatch[0]
                : "No Email Found",

            preview:
              text.substring(0, 250)

          })

        }

      })

      return results.slice(0, 5)

    })

    console.log("\n========== POSTS FOUND ==========\n")

    posts.forEach((post, index) => {

      console.log(`
POST ${index + 1}

EMAIL:
${post.recruiterEmail}

PREVIEW:
${post.preview}

==================================
`)

    })

    // SEND EMAILS
    for (const post of posts) {

      console.log(
        `📨 Sending email...`
      )

      await transporter.sendMail({

        from: process.env.GMAIL_EMAIL,

        // SAFE TESTING
        to: process.env.GMAIL_EMAIL,

        subject:
          "Application for Java Developer Role",

        text: `
Hello Recruiter,

I hope you are doing well.

I came across your hiring post on LinkedIn regarding a Java Developer Contract role.

I am interested in the opportunity and attaching my resume for consideration.

Looking forward to hearing from you.

Regards
Candidate
        `,

        attachments: [
          {
            filename: "resume.pdf",
            path: `${__dirname}/resume.pdf`
          }
        ]

      })

      console.log(
        `✅ Email sent successfully`
      )

    }

    console.log("\n========== AUTOMATION COMPLETE ==========\n")

    // SEND RESPONSE
    res.json({

      success: true,

      totalPosts: posts.length,

      message:
        "Automation completed successfully",

      posts

    })

  } catch (error) {

    console.log("\n❌ ERROR:\n")

    console.log(error)

    res.json({

      success: false,

      error: error.message

    })

  }

})

app.listen(5000, () => {

  console.log(
    "🚀 Server running on port 5000"
  )

})
